const fs = require("fs");
const path = require("path");

const { XMLBuilder } = require("fast-xml-parser");

const builder_options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true
};
const builder = new XMLBuilder(builder_options);

var in_path;
var out_path;
var is_recursive = true;
var is_checked = false;
var is_onefile = false;
var id_start = 0;
var id_arith = 0;

const id_map = new Map();
const col_map = new Map();
const _2dfx_map = new Map();
const col_file_map = [];

const col_file_list = [];
const ide_file_list = [];
const ipl_file_list = [];
const dff_file_set = new Set();

const ide_data = [];

var empty_dff_create = false;

const args = process.argv.slice(2);
var currentOption = null;
const options = {};
args.forEach((value, index) => {
  if (value.startsWith('-')) {
    currentOption = value.slice(1);
    if (value.startsWith('--')) {
      currentOption = value.slice(2);
    }
    if (args[index + 1] && (!args[index + 1].startsWith('-') || !isNaN(args[index + 1]) ) ) {
      options[currentOption] = args[index + 1];
    } else {
      options[currentOption] = true;
    }
  } else if (currentOption !== null) {
    options[currentOption] = value;
    currentOption = null;
  }
});

in_path = options.i || options.in || ".";
out_path = options.o || options.out || "vcmp_xml_out";
if(options.c || options.check) is_checked = true;
if(options.dr) is_recursive = false;
if(options.f || options.one || options.onefile) is_onefile = true;
if(options.s) id_start = parseInt(options.s);
if(options.a) id_arith = parseInt(options.a);

if(options.h || options.help)
{
	console.log("VC-Map Converter for VCMP-0.4 v1.0 beta 2 (20250429)");
	console.log("node convert2vcmpxml.js -i INPUT_DIR [-o OUTPUT_DIR] [-acfrs]");
	console.log("Options:");
	console.log("\t-i\t to specify the directory containing the ide, ipl, col [,dff] files. default: (current_directory)");
	console.log("\t-o\t to specify the output directory, otherwise .bak file will be created for each file. default: vcmp_xml_out");
	console.log("\t-s\t to specify the staring ID.");
	console.log("\t-a\t to specify the ID offset value. Each final ID will be added to it.");
	console.log("\t-f\t to enable outputting a single xml file named with the current timestamp, otherwise name it the same as each ide/ipl.");
	console.log("\t--dr\t to disable recursive search.");
	console.log("\t-c\t will check if the defined dff file exists, so the input directory needs to contain the mod's dff file, if not it will create and use empty.dff.");
	process.exit(0);
}

if(in_path && fs.statSync(in_path).isDirectory())
{
	const files = fs.readdirSync(in_path, { withFileTypes: true, recursive: is_recursive});
	files.forEach( file =>
	{
		if (file.isFile())
		{
			// https://nodejs.org/api/fs.html#direntparentpath
			// min: v18.20.0
			const fullpath = is_recursive ? path.join(path.dirname(in_path), file.parentPath, file.name) : path.join(in_path, file.name);
			if(is_checked && file.name.endsWith('dff')) dff_file_set.add(file.name);
			else if(file.name.endsWith('col')) col_file_list.push(fullpath);
			else if(file.name.endsWith('ide')) ide_file_list.push(fullpath);
			else if(file.name.endsWith('ipl')) ipl_file_list.push(fullpath);
		}
	});
}
else return;

for (const i of col_file_list) getCOLInfo(i);
for (const i of ide_file_list) getIDEInfo(i);

const obj_obj_template = 
{
	"?xml":
	{
		"@@version": "1.0",
		"@@encoding": "UTF-8",
		objectlist: { object: [] }
	}
};

const obj_obj_list_all = [];

const haveIDStart = typeof(options.s) !== 'undefined';
var count = 0;
for (const i of ide_data)
{
	const obj_obj_list = [];
	for (const arr of i.data)
	{
		var obj_type = 0; // 1: objs, 2: tobj
		const length = arr.length;
		if(length == 6 && parseInt(arr[3]) == 1) obj_type = 1;
		else if(length == 8 && parseInt(arr[3]) == 1) obj_type = 2;
		else continue;
		
		var _2dfx_obj_list = [];
		const _2dfx_list = _2dfx_map.get(parseInt(arr[0]));
		if(typeof(_2dfx_list) !== 'undefined')
		{
			for(const j of _2dfx_list)
			{
				const _length = j.length;
				if(_length == 14 && parseInt(j[8]) === 1) _2dfx_obj_list.push(format_2dfx_1(j));
				else if(_length == 20 && parseInt(j[8]) === 0) _2dfx_obj_list.push(format_2dfx_0(j));
				else continue;
			}
		}
		
		const colfile = col_file_map[col_map.get(arr[1])];

		const newid = ( haveIDStart ? id_start + count : parseInt(arr[0]) ) + id_arith;
		id_map.set(parseInt(arr[0]), newid);
		count += 1;
		
		const oldid = arr[0];
		arr[0] = newid;
		var obj_obj;
		if(obj_type == 1) obj_obj = format_objs_1(arr);
		else if(obj_type == 2) obj_obj = format_tobj_1(arr);
		if(_2dfx_obj_list.length !== 0) obj_obj["effect"] = _2dfx_obj_list;
		
		if(typeof(colfile) !== 'undefined') obj_obj["collision"] = { "@@path": colfile, "@@name": arr[1] };
		else console.log(`WARNING: ${i.filename}: No matched collision for object ID ${oldid}, collision type is set to none.`);
		
		if(is_checked && !dff_file_set.has(arr[1] + ".dff"))
		{
			obj_obj["model"]["@@path"] = "empty.dff";
			empty_dff_create = true;
			console.log(`WARNING: ${i.filename}: No matched DFF model for object ID ${oldid}, used 'empty.dff'.`);
		}
		
		obj_obj_list.push(obj_obj);
	}
	if(!is_onefile)
	{
		if(typeof(out_path) !== 'undefined')
		{
			const obj_obj_new = JSON.parse(JSON.stringify(obj_obj_template));
			obj_obj_new["?xml"].objectlist.object = obj_obj_list;
			
			const filepath = path.join(out_path, "objects", path.parse(i.filename).name + ".xml");
			fs.mkdirSync(path.join(out_path, "objects"), { recursive: true });
			fs.writeFileSync(filepath, builder.build(obj_obj_new));
			obj_xml_result = "";
			if(haveIDStart) console.log(`${i.filename} => ${filepath} ID: ${id_start + id_arith}~${id_start+count+id_arith-1}`);
			else console.log(`${i.filename} => ${filepath} ID offset: ${id_arith}`);
			id_start += count;
			count = 0;
		}
	}
	else obj_obj_list_all.concat(obj_obj_list);
}

const map_obj_template = 
{
	"?xml":
	{
		"@@version": "1.0",
		"@@encoding": "UTF-8",
		itemlist: { item: [] }
	}
};

const map_obj_list_all = [];
for (const i of ipl_file_list)
{
	const ipldata = fs.readFileSync(i, {encoding:'utf8'});
	const inst_list = ipldata.split(/\r?\n/).map(line => line.split('#')[0]);
	
	const map_obj_list = [];

	for(const inst of inst_list)
	{
		const values = inst.split(',').map(value => value.replaceAll('"', '').trim());
		if(values.length == 13) values.splice(2, 1); // Remove interior ID
		if(values.length == 12)
		{
			var newid = parseInt(values[0]);
			const mapped = id_map.get(parseInt(values[0]));
			if(typeof(mapped) !== 'undefined') newid = parseInt(mapped) + 6000;
			else
			{
				console.log(`WARNING: ${i}: Object ID ${newid} may be not defined.`);
			}
			values[0] = newid;
			map_obj_list.push(format_inst(values));
		}
	}
	
	if(!is_onefile)
	{
		if(typeof(out_path) !== 'undefined')
		{
			const map_obj = JSON.parse(JSON.stringify(map_obj_template));
			map_obj["?xml"].itemlist.item = map_obj_list;
			fs.mkdirSync(path.join(out_path, "maps"), { recursive: true });
			fs.writeFileSync(path.join(out_path, "maps", path.parse(i).name + ".xml"), builder.build(map_obj));
			console.log(i + " => " + path.join(out_path, "maps", path.parse(i).name + ".xml"));
		}
	}
	else map_obj_list_all.concat(map_obj_list);
}

if(is_onefile)
{
	if(typeof(out_path) !== 'undefined')
	{
		const obj_obj_new = JSON.parse(JSON.stringify(obj_obj_template));
		obj_obj_new["?xml"].objectlist.object = obj_obj_list_all;
		const map_obj = JSON.parse(JSON.stringify(map_obj_template));
		map_obj["?xml"].itemlist.item = map_obj_list_all;
		
		const now = new Date();
		fs.mkdirSync(path.join(out_path, "objects"), { recursive: true });
		fs.writeFileSync(path.join(out_path, "objects", "objects_" + now.getTime() + ".xml"), builder.build(obj_obj_new));
		fs.mkdirSync(path.join(out_path, "maps"), { recursive: true });
		fs.writeFileSync(path.join(out_path, "maps", "maps_" + now.getTime() + ".xml"), builder.build(map_obj));
		
		if(haveIDStart) console.log(path.join(out_path, "objects", "objects_" + now.getTime() + ".xml") + ` ID: ${id_start + id_arith}~${id_start+count+id_arith-1}`);
		else console.log(path.join(out_path, "objects", "objects_" + now.getTime() + ".xml") + ` ID offset: ${id_arith}`);
		
		console.log(path.join(out_path, "maps", "maps_" + now.getTime() + ".xml"));
	}
}

if(empty_dff_create)
{
	// 500 bytes DFF with one mesh (GTA3 format)
	const empty_dff_data = Buffer.from("EAAAAOgBAAD//wAIAQAAAAQAAAD//wAIAQAAAA4AAABgAAAA//8ACAEAAAA8AAAA//8ACAEAAAAAAIA/AAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAAAD/////AwACAAMAAAAMAAAA//8ACP7yUwIAAAAA//8ACBoAAAAgAQAA//8ACAEAAAAEAAAA//8ACAEAAAAPAAAABAEAAP//AAgBAAAAYAAAAP//AAhgAAAAAQAAAAMAAAABAAAAAACAPwAAgD8AAIA/AAABAAAAAgAAAAAAAACANBe3UTjat1E4AQAAAAAAAAAAAAA0AAAAAAAAAAAAAAA0AAAANQAAAAAAAAC0AAAANQAAAAAIAAAAVAAAAP//AAgBAAAACAAAAP//AAgBAAAA/////wcAAAA0AAAA//8ACAEAAAAcAAAA//8ACAAAAADVmuX/fN4YAAAAAAAAAIA/zcxMPQAAgD8DAAAAAAAAAP//AAgDAAAALAAAAP//AAgOBQAAIAAAAP//AAgAAAAAAQAAAAMAAAADAAAAAAAAAAEAAAAAAAAAAgAAABQAAAAoAAAA//8ACAEAAAAQAAAA//8ACAAAAAAAAAAABQAAAAAAAAADAAAAAAAAAP//AAgDAAAAAAAAAP//AAg=", "base64");
	fs.writeFileSync(path.join(out_path, "empty.dff"), empty_dff_data, {encoding:'hex'});
	console.log(path.join(out_path, "empty.dff"));
	console.log("WARNING: Empty dff has been generated, please remember to package it together!");
}

console.log("Processed");

function getCOLInfo(filepath)
{
	const header = Buffer.alloc(30);
	const colfile = fs.openSync(filepath, 'r');
	var offset = 0;
	const file_index = col_file_map.length;
	col_file_map.push(path.basename(filepath));
	
	while(1)
	{
		const bytes_header = fs.readSync(colfile, header, 0, 30, offset);
		if(bytes_header != 30) break;
		
		const string_u8 = header.toString('ascii');
		if(string_u8.slice(0,3) !== "COL") break;

		var i = 8;
		while(string_u8[i] !== '\0') i++;
		const colname = string_u8.slice(8, i);
		//console.log(colname);
		//collist.push(colname);
		
		col_map.set(colname, file_index);

		offset += 8 + header.readUInt32LE(4);
	}
	fs.closeSync(colfile);
}

function getIDEInfo(filepath)
{
	const idedata = fs.readFileSync(filepath, {encoding:'utf8'});
	const item_list = idedata.split(/\r?\n/).map(line => line.split('#')[0]);
	
	//var objs_1_list = [];
	//var tobj_1_list = [];
	const obj_list = [];
	for(const item of item_list)
	{
		const values = item.split(',').map(value => value.replaceAll('"', '').trim());
		const length = values.length;
		if(parseInt(values[3]) === 1 && (length == 6 || length == 8)) obj_list.push(values);
		else if(length == 14 || length == 20)
		{
			var orig = _2dfx_map.get(parseInt(values[0]));
			if(typeof(orig) === 'undefined')
			{
				orig = [];
				_2dfx_map.set(parseInt(values[0]), orig);
			}
			orig.push(values);
		}
	}
	ide_data.push(
	{
		filename: path.basename(filepath),
		data: obj_list
	});
}

function format_objs_1(j)
{
	const obj =
	{
		"@@id": j[0],
		flags: { "@@value": j[5] },
		collision: { "@@type": "none" },
		texture: { "@@path": j[2] + ".txd" },
		model: { "@@path": j[1] + ".dff", "@@distance": j[4] }
	};
	return obj;
}

function format_tobj_1(j)
{
	const obj =
	{
		"@@id": j[0],
		time: { "@@on": j[6], "@@off": j[7] },
		flags: { "@@value": j[5] },
		collision: { "@@type": "none" },
		texture: { "@@path": j[2] + ".txd" },
		model: { "@@path": j[1] + ".dff", "@@distance": j[4] }
	};
	return obj;
}

function format_2dfx_1(j)
{
	const obj =
	{
		position:
		{
			"@@x": j[1],
			"@@y": j[2],
			"@@z": j[3]
		},
		colour:
		{
			"@@r": j[4],
			"@@g": j[5],
			"@@b": j[6],
			"@@a": j[7]
		},
		type: j[8],
		particle:
		{
			type: j[9],
			strength:
			{
				"@@x": j[10],
				"@@y": j[11],
				"@@z": j[12]
			},
			scale: j[13]
		}
	};
	return obj;
}

function format_2dfx_0(j)
{
	const obj =
	{
		position:
		{
			"@@x": j[1],
			"@@y": j[2],
			"@@z": j[3]
		},
		colour:
		{
			"@@r": j[4],
			"@@g": j[5],
			"@@b": j[6],
			"@@a": j[7]
		},
		type: j[8],
		light:
		{
			distance: j[11],
			outerrange: j[12],
			size: j[13],
			innerrange: j[14],
			shadowintensity: j[15],
			flash: j[16],
			wet: j[17],
			flare: j[18],
			flags: j[19],
			corona: j[9],
			shadow: j[10]
		}
	};
	return obj;
}

function format_inst(j)
{
	const obj =
	{
		"@@model": j[0],
		"@@name": j[1],
		position:
		{
			"@@x": j[2],
			"@@y": j[3],
			"@@z": j[4]
		},
		rotation:
		{
			"@@format": "axisangle",
			"@@x": j[8],
			"@@y": j[9],
			"@@z": j[10],
			"@@angle": j[11]
		}
	};
	return obj;
}