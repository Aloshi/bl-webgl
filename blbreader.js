/**
 * Created by Alec "Aloshi" Lofquist.
**/

function getFile(path)
{
	objXml = new XMLHttpRequest();
	objXml.open("GET", path, false);
	objXml.send(null);
	return objXml.responseText;
}

function getBLB(path)
{
	return new BLB(getFile(path));
}

function cleanArray(lines)
{
	//strip empty lines and comments
	for(var i = 0; i < lines.length; i++)
	{
		lines[i] = lines[i].trim(); //note: not supported prior to roughly IE9/Chrome 10

		//strip comments
		var comment = lines[i].indexOf("//");
		if(comment != -1)
		{
			lines[i] = lines[i].substring(0, comment);
		}
		
		//if it's empty, we'll just get rid of it
		if(lines[i] === "")
		{
			lines.splice(i, 1);
			i--;
			continue;
		}
	}
}

function cleanCoord(line)
{
	for(var i = 0; i < line.length; i++)
	{
		if(line[i] === "")
		{
			line.splice(i, 1);
			i--;
		}
	}
}

function pushArray(arrSrc, arrDest)
{
	for(var i = 0; i < arrSrc.length; i++)
		arrDest.push(arrSrc[i]);
}

//builds index buffer that lets OpenGL ES render quads as a set of triangle primitives
function buildQuadIndices(blb)
{
	for(var i = 0; i < blb.quadCount; i++)
	{
		blb.indices.push(i*4 + 0);
		blb.indices.push(i*4 + 1);
		blb.indices.push(i*4 + 2);
		
		blb.indices.push(i*4 + 0);
		blb.indices.push(i*4 + 2);
		blb.indices.push(i*4 + 3);
		
		blb.indexCount += 6;
	}
}

function buildCube(x, y, z, blb)
{
	x /= 2;
	y /= 2 * 2.66666; //(brick up coordinates are weird)
	z /= 2;

	var verts = [
		//front
		-x, y, z,
		-x, -y, z,
		x, -y, z,
		x, y, z,
		
		//right
		x, y, z,
		x, -y, z,
		x, -y, -z,
		x, y, -z,
		
		//back
		x, y, -z,
		x, -y, -z,
		-x, -y, -z,
		-x, y, -z,
		
		//left
		-x, y, -z,
		-x, -y, -z,
		-x, -y, z,
		-x, y, z,
		
		//top
		-x, y, -z,
		-x, y, z,
		x, y, z,
		x, y, -z,
		
		//bottom
		-x, -y, z,
		-x, -y, -z,
		x, -y, -z,
		x, -y, z
	];
	
	pushArray(verts, blb.vertices);
	
	blb.quadCount += 6;
}

function buildCubeNormals(blb)
{
	var verts = blb.vertices;
	var normals = blb.normals;
	for(var i = 0; i < blb.quadCount; i++)
	{
		//build vec3 objects from the first 3 vertices in the quad
		var p1 = vec3.createFrom(verts[i*12], verts[i*12 + 1], verts[i*12 + 2]);
		var p2 = vec3.createFrom(verts[i*12 + 3], verts[i*12 + 3 + 1], verts[i*12 + 3 + 2]);
		var p3 = vec3.createFrom(verts[i*12 + 6], verts[i*12 + 6 + 1], verts[i*12 + 6 + 2]);
		
		//calculate the surface normal
		var v1 = vec3.create();
		vec3.subtract(p2, p1, v1);
		var v2 = vec3.create();
		vec3.subtract(p3, p1, v2);
		
		var normal = vec3.create();
		vec3.cross(v1, v2, normal);
		
		//write the normal 4 times
		for(var v = 0; v < 4; v++)
		{
			for(var d = 0; d < 3; d++)
			{
				normals.push(normal[d]);
			}
		}
	}
}

function packFinalArray(blb)
{
	var verts = blb.vertices;
	var normals = blb.normals;
	var finalArray = blb.finalArray;
	
	var vertSize = 3+3;
	for(var i = 0; i < blb.quadCount * 4; i++) //for each vertex...
	{
		//copy over this vertex's position
		for(var v = 0; v < 3; v++)
		{
			finalArray.push(verts[i*3 + v]);
		}
		
		//copy over this vertex's normal
		for(var v = 0; v < 3; v++)
		{
			finalArray.push(normals[i*3 + v]);
		}
		
		//copy over this vertex's texture coordinate
		//finalArray.push(texCoords[i*2 + 0]);
		//finalArray.push(texCoords[i*2 + 1]);
	}
}

//Create a new BLB file from the string data. Note that data contains the entire .blb file, not a path.
function BLB(data)
{
	this.vertexBuffer = -1;
	this.indexBuffer = -1;
	
	this.getVBO = function (gl)
	{
		//if the vertex buffer doesn't exist yet, create it and upload data to it
		if(this.vertexBuffer == -1)
		{
			this.vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.finalArray), gl.STATIC_DRAW);
		}
		
		return this.vertexBuffer;
	}
	
	this.getIBO = function (gl)
	{
		//if the index buffer doesn't exist yet, create it and upload data to it
		if(this.indexBuffer == -1)
		{
			this.indexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
		}
		
		return this.indexBuffer;
	}




	//split the data into an array where each element is a line
	var lines = data.split("\n");
	cleanArray(lines);
	
	this.quadCount = 0;
	this.indexCount = 0;
	
	this.vertices = [];
	this.normals = [];
	this.finalArray = [];
	this.indices = [];
	
	
	if(lines.length < 2)
	{
		console.log("Error - Number of real lines in .blb file less than 2.");
		this.invalid = true;
		return;
	}
	
	
	//first we read the "bounding box" in Blockland grid coordinates (scale by 1, 1, 3)
	var box = lines[0].split(" ");
	
	this.boundingbox = [box[0], box[2] / 2.66666, box[1]];
	
	//next is the type
	var type = lines[1];
	
	if(type === "BRICK")
	{
		buildCube(-box[0], box[2], box[1], this); //swap y and z because blockland uses Z+ as up vector
		buildCubeNormals(this);
		packFinalArray(this);
		buildQuadIndices(this);
		return;
	}
	
	if(type !== "SPECIAL")
	{
		console.log("Error - Invalid .blb file.");
		this.invalid = true;
		return;
	}
	
	
	
	
	//now we handle special bricks
	var cur = 2;

	//this isn't really error-checking, and just assumes that everything will be as it should
	//you could force the order by nesting these ifs and do error checking if you really wanted
	
	var positionQuadCount = 0;
	var normalQuadCount = 0;
	var texCoordQuadCount = 0;
	
	while(cur < lines.length)
	{
		var line = lines[cur];
		
		if(line.indexOf("POSITION:") != -1)
		{
			//next 4 lines should be quad vertices
			for(var i = 0; i < 4; i++)
			{
				cur++; var line = lines[cur];
				
				var coord = line.split(" ");
				cleanCoord(coord);
				
				var fixedCoord = [coord[0], coord[2] / 2.66666, coord[1]]; //flip y and z, scale up
				
				pushArray(fixedCoord, this.vertices);
			}
			
			positionQuadCount++;
			
			this.quadCount++;
		}
		
		if(line.indexOf("UV COORDS:") != -1)
		{
			//next 4 lines should be quad texture coordinates
			for(var i = 0; i < 4; i++)
			{
				//ignore for now, but skip over them
				cur++; /*var line = lines[cur];
				pushArray(line.split(" "), this.texCoords);*/
			}
			
			texCoordQuadCount++;
		}
		
		if(line.indexOf("NORMALS:") != -1)
		{
			//next 4 lines should be quad normals
			for(var i = 0; i < 4; i++)
			{
				cur++; var line = lines[cur];
				
				var coord = line.split(" ");
				cleanCoord(coord);
				
				var fixedCoord = [coord[0], coord[2], coord[1]]; //flip y and z
				
				pushArray(fixedCoord, this.normals);
			}
			
			normalQuadCount++;
		}
	
		cur++;
	}
	
	if(positionQuadCount != normalQuadCount)
	{
		console.log("Warning - positionQuadCount != normalQuadCount!");
		return;
	}
	
	packFinalArray(this);
	buildQuadIndices(this);
}
