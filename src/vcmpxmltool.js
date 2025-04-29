const fs = require("fs");
const path = require("path");
const { XMLParser, XMLBuilder } = require("fast-xml-parser");

const builder_options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true
};
const parser = new XMLParser(builder_options);
const builder = new XMLBuilder(builder_options);

var map_in;
var obj_in;
var dir_out;

var is_convertxml = false;

var id_start = 0;
var id_arith = 0;

var offset_x = 0.0;
var offset_y = 0.0;
var offset_z = 0.0;
var offset_rx = 0.0;
var offset_ry = 0.0;
var offset_rz = 0.0;
var offset_angle = 0.0;

const id_map = new Map();

const args = process.argv.slice(2);
var currentOption = null;
const options = {};
args.forEach((value, index) => {
  if (value.startsWith('-')) {
    currentOption = value.slice(1);
    if (value.startsWith('--')) {
      currentOption = value.slice(2);
    }
    if (args[index + 1] && (!args[index + 1].startsWith('-') || !isNaN(args[index + 1]))) {
      options[currentOption] = args[index + 1];
    } else {
      options[currentOption] = true;
    }
  } else if (currentOption !== null) {
    options[currentOption] = value;
    currentOption = null;
  }
});

map_in = options.map || options.m;
obj_in = options.obj;
dir_out = options.out || options.o;

if(options.c) is_convertxml = true;
if(options.s) id_start = parseInt(options.s);
if(options.a) id_arith = parseInt(options.a);
if(options.x) offset_x = parseFloat(options.x);
if(options.y) offset_y = parseFloat(options.y);
if(options.z) offset_z = parseFloat(options.z);
if(options.rx) offset_rx = parseFloat(options.rx);
if(options.ry) offset_ry = parseFloat(options.ry);
if(options.rz) offset_rz = parseFloat(options.rz);
if(options.angle) offset_angle = parseFloat(options.angle);

if(options.h || options.help)
{
	console.log("VCMP Map XML Tool v1.0 beta 2 (20250429)");
	console.log("node vcmpxmltool.js [--map MAPS_XML_DIR] [--obj OBJECTS_XML_DIR] [-o OUTPUT_DIR] [-c] [-saxyz NUMBER] [-rx NUMBER] [-ry NUMBER] [-rz NUMBER] [--angle NUMBER]");
	console.log("Options:");
	console.log("\t--map / --obj\t\t to specify the directory of XML files (Maps or Objects).");
	console.log("\t-o / --output\t\t to specify the output directory, otherwise .bak file will be created for each file.");
	console.log("\t-s\t\t\t to specify the staring ID.");
	console.log("\t-a\t\t\t to specify the ID offset value. Each final ID will be added to it.");
	console.log("\t-c\t\t\t convert to IDE/IPL.");
	console.log("\t-x / -y / -z / -rx / -ry / -rz / -angle\t\t to specify the Position X/Y/Z and Rotation X/Y/Z/Angle offset value. Each final value will be added to it.");
	process.exit(0);
}

if(obj_in)
{
	const obj_in_stat = fs.statSync(obj_in);
	if(obj_in_stat.isDirectory())
	{
		const files = fs.readdirSync(obj_in, { withFileTypes: true });
		files.forEach( file =>
		{
			if (!file.isFile() || !file.name.endsWith('xml')) return;
			processXML(path.join(obj_in, file.name), "objects");
		});
	}
	else if(obj_in_stat.isFile()) processXML(obj_in, "objects");
}

if(map_in)
{
	const map_in_stat = fs.statSync(map_in);
	if(map_in_stat.isDirectory())
	{
		const files = fs.readdirSync(map_in, { withFileTypes: true });
		files.forEach( file =>
		{
			if (!file.isFile() || !file.name.endsWith('xml')) return;
			processXML(path.join(map_in, file.name), "maps");
		});
	}
	else if(map_in_stat.isFile()) processXML(map_in, "maps");
}

function processXML(filepath, xmltype)
{
	const xmldata = fs.readFileSync(filepath, {encoding:'utf8'});
	const xmlobj = parser.parse(xmldata);

	const findarray = function(obj) // by ChatGPT
	{
		if(typeof(obj) === 'object')
		{
			for (const key in obj)
			{
				if (Array.isArray(obj[key])) return obj[key];
				const result = findarray(obj[key]);
				if (result) return result;
			}
		}
	}
	const xmlarray = findarray(xmlobj);
	if(typeof(xmlarray) === 'undefined') return;
	
	if(xmltype === "objects")
	{
		var haveIDStart = true;
		var i = 0;
		if(typeof(options.s) === 'undefined') haveIDStart = false;
		
		xmlarray.forEach(object =>
		{
			const newid = ( haveIDStart ? id_start + i : parseInt(object["@@id"]) ) + id_arith;
			id_map.set(parseInt(object["@@id"]), newid);
			object["@@id"] = newid;
			i += 1;
		});
		
		if(haveIDStart) console.log(`${filepath} ${id_start + id_arith}~${id_start+i+id_arith-1}`);
		else console.log(`${filepath} ID offset: ${id_arith}`);
		
		id_start += i;
	}
	else
	{
		xmlarray.forEach(object =>
		{
			const mapped = id_map.get(parseInt(object["@@model"] - 6000));
			if(typeof(mapped) !== 'undefined') object["@@model"] = mapped + 6000;
			object["position"]["@@x"] = parseFloat(object["position"]["@@x"]) + offset_x;
			object["position"]["@@y"] = parseFloat(object["position"]["@@y"]) + offset_y;
			object["position"]["@@z"] = parseFloat(object["position"]["@@z"]) + offset_z;
			object["rotation"]["@@x"] = parseFloat(object["rotation"]["@@x"]) + offset_rx;
			object["rotation"]["@@y"] = parseFloat(object["rotation"]["@@y"]) + offset_ry;
			object["rotation"]["@@z"] = parseFloat(object["rotation"]["@@z"]) + offset_rz;
			object["rotation"]["@@angle"] = parseFloat(object["rotation"]["@@angle"]) + offset_angle;
		});
	}
	
	if(is_convertxml)
	{
		fs.mkdirSync(dir_out, { recursive: true });
		if(xmltype === "objects")
		{
			var _2dfx_light = [];
			var _2dfx_particle = [];
			var objs = [];
			var tobj = [];
			xmlarray.forEach(object =>
			{
				if(typeof(object["time"]) !== 'undefined') tobj.push(object);
				else objs.push(object);
				
				var effect_list = object["effect"];
				if(typeof(effect_list) !== 'undefined')
				{
					if(!Array.isArray(effect_list)) effect_list = [effect_list];
					effect_list.forEach(effect_obj =>
					{
						effect_obj["@@id"] = object["@@id"];
						if(typeof(effect_obj["light"]) !== 'undefined') _2dfx_light.push(effect_obj);
						else if(typeof(effect_obj["particle"]) !== 'undefined') _2dfx_particle.push(effect_obj);
					});
				}
			});
			
			var ide_content = "objs\n";
			
			objs.forEach(object =>
			{
				ide_content += `${object["@@id"]}, ${path.parse(object["model"]["@@path"]).name}, ${path.parse(object["texture"]["@@path"]).name}, 1, ${object["model"]["@@distance"]}, ${object["flags"]["@@value"]}\n`;
			});
			
			ide_content += "end\n";
			ide_content += "tobj\n";
			
			tobj.forEach(object =>
			{
				ide_content += `${object["@@id"]}, ${path.parse(object["model"]["@@path"]).name}, ${path.parse(object["texture"]["@@path"]).name}, 1, ${object["model"]["@@distance"]}, ${object["flags"]["@@value"]}, ${object["time"]["on"]}, ${object["time"]["off"]}\n`;
			});
			
			ide_content += "end\n";
			ide_content += "2dfx\n";
			
			_2dfx_light.forEach(effect =>
			{
				const pos = effect["position"];
				const color = effect["colour"];
				const light = effect["light"];
				ide_content += `${effect["@@id"]}, ${pos["@@x"]}, ${pos["@@y"]}, ${pos["@@z"]}, ${color["@@r"]}, ${color["@@g"]}, ${color["@@b"]}, ${color["@@a"]}, ${effect["type"]}, "${light["corona"]}", "${light["shadow"]}", ${light["distance"]}, ${light["outerrange"]}, ${light["size"]}, ${light["innerrange"]}, ${light["shadowintensity"]}, ${light["flash"]}, ${light["wet"]}, ${light["flare"]}, ${light["flags"]}\n`;
			});
			
			_2dfx_particle.forEach(effect =>
			{
				const pos = effect["position"];
				const color = effect["colour"];
				const particle = effect["particle"];
				ide_content += `${effect["@@id"]}, ${pos["@@x"]}, ${pos["@@y"]}, ${pos["@@z"]}, ${color["@@r"]}, ${color["@@g"]}, ${color["@@b"]}, ${color["@@a"]}, ${effect["type"]}, ${particle["type"]}, ${particle["strength"]["@@x"]}, ${particle["strength"]["@@y"]}, ${particle["strength"]["@@z"]}, ${particle["scale"]}\n`;
			});
			
			ide_content += "end\n";
			
			if(typeof(dir_out) === 'undefined') fs.writeFileSync(filepath + '.ide', ide_content);
			else fs.writeFileSync(path.join(dir_out, path.parse(filepath).name + '.ide'), ide_content);
		}
		else
		{
			var ipl_content = "inst\n";
			xmlarray.forEach(object =>
			{
				const modelid = (parseInt(object["@@model"]) - 6000);
				const pos = object["position"];
				const rot = object["rotation"];
				ipl_content += `${modelid}, ${object["@@name"]}, 0, ${pos["@@x"]}, ${pos["@@y"]}, ${pos["@@z"]}, 1, 1, 1, ${rot["@@x"]}, ${rot["@@y"]}, ${rot["@@z"]}, ${rot["@@angle"]}\n`;
			});
			ipl_content += "end\n";
			
			if(typeof(dir_out) === 'undefined') fs.writeFileSync(filepath + '.ipl', ipl_content);
			else fs.writeFileSync(path.join(dir_out, path.parse(filepath).name + '.ipl'), ipl_content);
		}
	}
	else
	{
		const xmlContent = builder.build(xmlobj);
		if(typeof(dir_out) === 'undefined')
		{
			fs.renameSync(filepath, filepath + '.bak');
			fs.writeFileSync(filepath, xmlContent);
		}
		else
		{
			fs.mkdirSync(path.join(dir_out, xmltype), { recursive: true });
			fs.writeFileSync(path.join(dir_out, xmltype, path.basename(filepath)), xmlContent);
		}
	}
}
