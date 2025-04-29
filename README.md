# vcmp-map-converter [中文](#%E4%B8%AD%E6%96%87%E8%AF%B4%E6%98%8E)
GTA Vice City / VCMP map definition data, convert to to each other.

Feature:
- IDE / IPL to XML
- Process 2dfx definition (only support type 0: lights and type 1: particles) and time object definition
- Rearrange object ID
- Process map.xml and object.xml in one-to-one ID correspondence
- Move the map position/object ID as a whole
- Automatically find the corresponding col file for the object
- Check if the object only has collision but no model, and assigns it an empty model file
- XML to IDE / IPL / XML

## Usage
Require Node.js (>= v18.20.0)

clone this repo then run `npm install`
### convert2vcmpxml.js
VC-Map Converter for VCMP-0.4

`node convert2vcmpxml.js -i INPUT_DIR [-o OUTPUT_DIR] [-acfrs]`

Options:

-i to specify the directory containing the ide, ipl, col [,dff] files. default: (current_directory)

-o to specify the output directory, otherwise .bak file will be created for each file. default: vcmp_xml_out

-s to specify the staring ID.

-a to specify the ID offset value. Each final ID will be added to it.

-f to enable outputting a single xml file named with the current timestamp, otherwise name it the same as each ide/ipl.

--dr to disable recursive search.

-c will check if the defined dff file exists, so the input directory needs to contain the mod's dff file, if not it will create and use empty.dff.

### vcmpxmltool.js
VCMP Map XML Tool

`node vcmpxmltool.js [--map MAPS_XML_DIR] [--obj OBJECTS_XML_DIR] [-o OUTPUT_DIR] [-c] [-saxyz NUMBER] [-rx NUMBER] [-ry NUMBER] [-rz NUMBER] [--angle NUMBER]`

Options:

--map / --obj to specify the directory of XML files (Maps or Objects).

-o / --output to specify the output directory, otherwise .bak file will be created for each file.

-s to specify the staring ID.

-a to specify the ID offset value. Each final ID will be added to it.

-c convert to IDE/IPL.

-x / -y / -z / -rx / -ry / -rz / -angle to specify the Position X/Y/Z and Rotation X/Y/Z/Angle offset value. Each final value will be added to it.

# 中文说明
GTA Vice City / VCMP 地图定义类数据转换工具

特性：
- IDE / IPL 转 XML
- 支持 2dfx (类型 0: 灯光 和 类型 1: 粒子), tobj
- 从指定 ID 开始，重新编排所有 ID
- 地图 XML 和 OBJ XML, ID 一一对应
- 整体偏移地图坐标，整体偏移 OBJ ID
- 自动为物体寻找其碰撞所在的碰撞文件
- 自动检查是否有 无模型，但有碰撞的物体，并为其指定空碰撞
- XML 转 IDE / IPL / XML

## 使用
需要安装 Node.js (>= v18.20.0) 环境

克隆本仓库之后，使用命令行进入仓库根目录运行 `npm install` 安装依赖。
### convert2vcmpxml.js
VC 地图转换器 for VCMP0.4

基本用法：

`node convert2vcmpxml.js -i 输入目录 [-o 输出目录] [-acfrs]`

选项说明：

-i 指定欲转换地图所属的，包含 ide, ipl, col [,dff] 文件的目录。默认为当前工作目录。

-o 指定输出目录。默认：vcmp_xml_out

-s 指定起始物体 ID。

-a 指定 ID 偏移值。（其实就是每个 ID 都会加上这个数）

-f 合并输出单个 XML 文件，以当前时间戳命名。否则会根据原始文件名命名。

--dr 禁止递归处理文件。（默认是启用的，也就是说直接指定地图 mod 所在目录就可以了）

-c 会检查 ide 中定义 obj 的模型文件是否存在，不存在则自动使用空模型 (empty.dff)。启用该项时确保 dff 文件存在于输入目录中。

### vcmpxmltool.js
VCMP 地图 XML 实用工具（是不是应该翻成 map helper）

基本用法：
`node vcmpxmltool.js [--map 地图XML所在目录] [--obj 物体XML所在目录] [-o 输出目录] [-c] [-saxyz 数值] [-rx 数值] [-ry 数值] [-rz 数值] [--angle 数值]`

选项说明:

--map / --obj 分别指定 maps 和 objects 目录，包含将要进行处理的 XML 文件。

-o / --output 指定输出目录，不指定的话会自动创建 .bak 备份文件。

-s 指定起始物体 ID。

-a 指定 ID 偏移值。

-c 处理完毕后转换为 IDE/IPL 文件。

-x / -y / -z / -rx / -ry / -rz / -angle 指定整体坐标、旋转的偏移值。