/**
 * Created by Alec "Aloshi" Lofquist.
**/

//note: this script depends on getFile() and pushArray() defined in blbreader.js

function getBLS(path)
{
	return new BLS(getFile(path));
}

function calcCenter(bls)
{
	//find min and max position on each axis
	var initPos = bls.bricks[0].position;
	var min = vec3.createFrom(initPos[0], initPos[1], initPos[2]);
	var max = vec3.createFrom(initPos[0], initPos[1], initPos[2]);
	
	for(var i = 0; i < bls.bricks.length; i++)
	{
		var pos = bls.bricks[i].position;
		var box = bls.bricks[i].blb.boundingbox;
		
		for(var d = 0; d < 3; d++)
		{
			if(pos[d] - (box[d] / 2) < min[d])
				min[d] = pos[d];
			if(pos[d] + (box[d] / 2) > max[d])
				max[d] = pos[d];
		}
	}
	
	//calculate the center from min + ((max - min) * 0.5)
	var center = vec3.create();
	vec3.set(min, center);

	var mid = vec3.create();
	vec3.subtract(max, min, mid);
	
	vec3.scale(mid, 0.5);

	vec3.add(center, mid, center);

	return center;
}

function Brick(name, position, angleid, colorid)
{
	this.name = name;
	this.position = position;
	this.angleid = angleid;
	this.colorid = colorid;
	this.blb = nameToBLB(name);
}

//Create a new BLS file from the string data. Note that data contains the entire .bls file, not a path.
function BLS(data)
{
	this.bricks = [];

	lines = data.split("\n");
	
	var cur = 1; //skip first line (it's a warning not to tamper with save files)
	cur += parseInt(lines[cur]) + 1; //second line is how long the description is (skip it)
	
	//read colorset
	this.colorset = []; //actually an array of arrays
	
	//everything between lines[3] and wherever Linecount is is a color in the colorset
	while(lines[cur].indexOf("Linecount ") == -1)
	{
		var color = lines[cur].split(" ");
		if(color.length != 4)
		{
			console.log("Error - invalid save colorset color: " + color + " (line " + cur + ")");
			cur++;
			continue;
		}
		
		this.colorset.push(new Float32Array(color)); //stored as native Float32Arrays so that OpenGL can use them directly
		cur++;
	}
	
	var targetLinecount = lines[cur].split(" ")[1];
	cur++;
	
	while(cur < lines.length)
	{
		var line = lines[cur];
		cur++;
		
		//if this line is not a brick, skip it (it's a property definition)
		if(line.indexOf("+-") != -1)
			continue;
		
		var uiname = line.substring(0, line.indexOf("\""));
		
		//if the uiname is empty, we probably screwed up and read something invalid, so skip it
		if(uiname === "")
			continue;
		
		line = line.substring(line.indexOf("\"") + 2);
		
		line = line.split(" ");
		
		var position = [-line[0] * 2, line[2] * 1.85, line[1] * 2];
		var angleid = line[3];  //skip line[4] (isBaseplate)
		var colorid = line[5];
		
		this.bricks.push(new Brick(uiname, position, angleid, colorid));
	}
	
	if(this.bricks.length > 0)
		this.center = calcCenter(this);
}

var blsMapConv = getFile("blbmap.txt").split("\n");
var blbMap = {};
function nameToBLB(name)
{
	if(blbMap[name])
	{
		return blbMap[name];
	}else{
		for(var i = 0; i < blsMapConv.length; i++)
		{
			var line = blsMapConv[i].split("\"");
			if(line[0] === name)
			{
				blbMap[name] = getBLB("blbs/" + encodeURIComponent(line[1]));
				return blbMap[name];
			}
		}
		
		console.log("Error - could not find BLB named \"" + name + "\" in map.");
	}
}
