if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, sessionContainer;
var data, allData, sessionCount, shownSessionsNumber, maxClicks = 0, maxTimeSpent = 0;
var camera, sessionCamera, scene, sessionScene, labelScene, renderer, sessionRenderer;
var plane, cube;
var mouse, raycaster;
var selectedLabel;
var squareEdgeSize = 50, xSize, ySize, zSize;
var events = ['list', 'view', 'basket', 'purchase_processed', 'search', 'rating'];
var lowDurationThreshold, highDurationThreshold;
var minSessionNumber = 0, maxSessionNumber = 19, step = 20;


var rollOverMesh, rollOverMaterial;
//var cubeGeo, cubeMaterial;

var objects = [];
var sessionObjects = [];
var colorPalette = {};
var eventCounts = {};

getData();

// loads the data - asynch.. once data is loaded, initialize the scene
function getData() {
	var request = new XMLHttpRequest();
	request.open("GET", "/data/vd200sessionsTS.json", true);
	request.onload = function(e) {
		allData = JSON.parse(request.responseText);
		sessionCount = allData.length;
		data = allData.slice(minSessionNumber, maxSessionNumber+1);
		init();
		render();
	};

	request.send(null)
}

function getNumberOfSessionsToShow() {
	if (data.length > step) {
		return maxSessionNumber - minSessionNumber + 1;
	}
	return data.length;
}

function init() {
	
	updateShownSessionNumbers();
	initEventCounts();
	container = document.createElement( 'div' );
	container.id = "canvas";
	document.body.appendChild( container );
	
	// camera
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 600, 1300, -1300 );
	camera.lookAt( new THREE.Vector3() );

	// scene
	scene = new THREE.Scene();
	labelScene = new THREE.Scene();
	
	// controls
	controls = new THREE.OrbitControls( camera, container );
	controls.maxPolarAngle = Math.PI;
	controls.minDistance = 500;
	controls.maxDistance = 7500;
	
	// visualize data
	buildVisualization();
	
	// grid
	createGrid3d(scene);					
	labelAxes();
	
	// position camera
	camera.position.set(xSize/2, ySize+500, -1500);
	controls.target.set(xSize/2, ySize/4, zSize/2);
	controls.update();
	
	// menu items: slider + select
	createSliders();
	initSelect();
	updateEventCounts();

	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();

	// ground
	var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
	geometry.rotateX( - Math.PI / 2 );
	plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
	scene.add( plane );

	objects.push( plane );

	// lights
	createLights(scene);

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.autoClear = false;
	container.appendChild( renderer.domElement );
	
	

	container.addEventListener( 'mousemove', onDocumentMouseMove, false );
	container.addEventListener( 'mousedown', onDocumentMouseDown, false );
	
	window.addEventListener( 'resize', onWindowResize, false );
}

function initEventCounts() {
	eventCounts['list'] = 0;
	eventCounts['view'] = 0;
	eventCounts['basket'] = 0;
	eventCounts['purchase_processed'] = 0;
	eventCounts['search'] = 0;
	eventCounts['rating'] = 0;
}

function initSessionView(totalTime) {
	console.log("initSessionView");
	sessionContainer = document.createElement( 'div' );
	sessionContainer.id = "smallCanvas";
	document.getElementById('session').appendChild(sessionContainer);

	sessionCamera = new THREE.OrthographicCamera( 50 + totalTime/2, - 50 - totalTime/2, 30, -30, 1, 500 );
	sessionCamera.position.set( 0, 0, -50 );
	sessionCamera.lookAt( new THREE.Vector3() );
	
	sessionScene = new THREE.Scene();
	
	createLights(sessionScene);
	var directionalLight = new THREE.DirectionalLight( 0x808080 );
	directionalLight.position.x = 0;
	directionalLight.position.y = 0;
	directionalLight.position.z = -1;
	directionalLight.position.normalize();
	sessionScene.add( directionalLight );

	sessionRenderer = new THREE.WebGLRenderer( { antialias: true } );
	sessionRenderer.setClearColor( 0xf0f0f0 );
	sessionRenderer.setPixelRatio( window.devicePixelRatio );
	sessionRenderer.setSize( 330, 100 );
	sessionRenderer.autoClear = false;
	sessionContainer.appendChild( sessionRenderer.domElement );
					
	renderSessionView();
}



/* ---------- VISUAL MAPPING OF DATASET ------------ */
function initColorPalette() {
	colorPalette['list'] = 0x267DB3;
	colorPalette['view'] = 0xFAD55C;
	colorPalette['basket'] = 0x68C182;
	colorPalette['purchase_processed'] = 0x8561C8;
	colorPalette['search'] = 0x6DDBDB;
	colorPalette['rating'] = 0xED6647;			
	colorLegend();
}

function colorLegend() {
	events.forEach(colorLegendItem);
} 

function colorLegendItem(item) {
	var legendElement = document.querySelectorAll("div."+item)[0];
	//console.log(colorPalette[item],c_to_rgb(colorPalette[item]));
	legendElement.style.backgroundColor = c_to_rgb(colorPalette[item]);
	//console.log("afterChange", legendElement.style.backgroundColor);
} 

function buildVisualization() {
	initColorPalette();
	data.forEach(createSessionVisualization);
}

function buildAlternativeSessionView(sessionIndex, totalTime) {
	console.log("buildAlternativeSessionView");
	var elem = document.getElementById("smallCanvas");
	if (elem) elem.remove();
	initSessionView(totalTime);
	sessionObjects = [];
	var offset = -totalTime/2;
	
	if (sessionIndex > -1) {
		for (var i = 0; i < data[sessionIndex].clicks.length; i++) {
			buildAlternativeDataPointView(data[sessionIndex].clicks[i], offset, totalTime, i%2);
			offset += (data[sessionIndex].clicks[i].timeSpent);
		}
	}
	
	renderSessionView();
}

function buildAlternativeDataPointView(item, offset, totalTime, odd) {
	// vizual mapping
	var cubeGeo = new THREE.BoxGeometry( item.timeSpent, 25, 5 );
	var cubeMaterial = new THREE.MeshPhongMaterial( { color: colorPalette[item.event] } );
	
	// create cube
	var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
	voxel.position.x = offset + item.timeSpent/2;
	voxel.position.y = 12.5;
	voxel.position.z = 0;
	voxel.eventType = item.event;
	
	// add cube to scene
	sessionScene.add( voxel );
	sessionObjects.push( voxel );
	
	sectionViewLabel(offset + item.timeSpent, offset + totalTime/2 + item.timeSpent, totalTime/10, odd);
}

function sectionViewLabel(xcoord, value, size, odd) {
	var x = document.createElement('canvas');
	var xc = x.getContext("2d");
	x.width = 64;
	x.height = 128;

	xc.fillStyle = "black";
	xc.font = "26pt arial bold";
	xc.fillText(Math.round(value), 0, 50);

	var xm = new THREE.MeshBasicMaterial({ map: new THREE.Texture(x), transparent: true });
	xm.map.needsUpdate = true;
	var voxel = new THREE.Mesh(new THREE.CubeGeometry(size, 25, size), xm);
	voxel.position.x = xcoord;
	if (odd) {
		voxel.position.y = -20;
	} else {
		voxel.position.y = -12.5;
	}
	
	voxel.position.z = 0;
	sessionScene.add( voxel );
	sessionObjects.push( voxel );
	
}


function rebuildVisualization(eventList, lowEventCount, highEventCount, lowEventDuration, highEventDuration, swapSessions) {		
	if (swapSessions) {data = allData.slice(minSessionNumber, maxSessionNumber+1);}
	else { filterSessions(eventList, lowEventCount, highEventCount); }
	
	console.log("DATA: ", data);				
	lowDurationThreshold = lowEventDuration;
	highDurationThreshold = highEventDuration;
	objects = [];
	eventCounts = {};
	sessionCount = allData.length; maxClicks = 0; maxTimeSpent = 0;		
	
	xSize = 0; ySize = 0; zSize = 0;
	var elem = document.getElementById("canvas");
	elem.remove();
	var elem2 = document.getElementById("smallCanvas");
	if (elem2) {
		elem2.remove();
	}
	
	init();
	$( "#smallCanvas" ).addClass( "hidden" );
	render();		
}

function reset() {
	var checkedBoxes = document.querySelectorAll('input[class=checkbox]:checked');
	var eventList = [];
	for (var i = 0; i < checkedBoxes.length; i++) {
		checkedBoxes[i].checked = false;
	}
	
	minSessionNumber = 0; maxSessionNumber = 19;
	lowDurationThreshold = null;
	highDurationThreshold = null;
	eventCounts = {};
	objects = [];
	sessionCount = allData.length; maxClicks = 0; maxTimeSpent = 0;
	xSize = 0; ySize = 0; zSize = 0;
	var elem = document.getElementById("canvas");
	elem.remove();
	elem = document.getElementById("smallCanvas");
	if (elem) {
		elem.remove();
	}
	getData();		
}

function filterSessions(eventList, lowEventCount, highEventCount) {
	
	var i = data.length;
	while (i--) {
		//console.log(data[i], lowEventCount, highEventCount);
		if (!(containsRequired(data[i], eventList)) || data[i].clicks.length > highEventCount 
			|| data[i].clicks.length < lowEventCount) {
			data.splice(i, 1);
		}
	}
}

function containsRequired(session, eventList) {
	var tmpArray = eventList.slice();
	for (var i = 0; i < session.clicks.length; i++) {
		
		if (tmpArray.indexOf(session.clicks[i].event) != -1) {
			tmpArray.splice(tmpArray.indexOf(session.clicks[i].event), 1);
			if (tmpArray.length == 0) return true;
		}
	}
	
	if (tmpArray.length == 0) return true;
	return false;
}

function createSessionVisualization(session, sessionIndex) {					
	// finds maxClicks for grid creating purpose
	if (session.clicks.length > maxClicks) {
		maxClicks = session.clicks.length;
	}

	for (i = 0; i < session.clicks.length; i++) {
		if (isInDurationRange(session.clicks[i].timeSpent)) {
			buildDataPoint(session.clicks[i], i, sessionIndex);
		}	
	}
}

function isInDurationRange(timeSpent) {
	return (!lowDurationThreshold ||  timeSpent >= lowDurationThreshold) && 
	(!highDurationThreshold ||  timeSpent <= highDurationThreshold);
}

function buildDataPoint(click, clickIndex, sessionIndex) {
	// finds maxTimeSpent for grid creating purpose
	if (click.timeSpent > maxTimeSpent) {
		maxTimeSpent = click.timeSpent;
	}
	
	// vizual mapping
	var cubeGeo = new THREE.BoxGeometry( squareEdgeSize, click.timeSpent, squareEdgeSize );
	var cubeMaterial = new THREE.MeshPhongMaterial( { color: colorPalette[click.event] } );
	eventCounts[click.event]++;
	
	// create cube
	var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
	voxel.position.x = clickIndex*squareEdgeSize + squareEdgeSize/2;
	voxel.position.y = click.timeSpent/2;
	voxel.position.z = sessionIndex*squareEdgeSize + squareEdgeSize/2;
	voxel.eventType = click.event;
	
	// add cube to scene
	scene.add( voxel );
	objects.push( voxel );
}

/* ---------- VISUAL MAPPING OF DATASET END ------------ */
// *************************************************************************************************************************************
function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseMove( event ) {

	event.preventDefault();	
	render();

}

function allowDrop(ev) {
	ev.preventDefault();
}

function drag(ev) {
	ev.dataTransfer.setData("text", ev.srcElement.className);
}

function drop(ev) {			
	
	ev.preventDefault();
	
	var srcClass = ev.dataTransfer.getData("text");
	var srcElement = document.querySelectorAll("div."+srcClass)[0];

	var srcColor = window.getComputedStyle(srcElement, null).getPropertyValue("background-color");
	var targColor = window.getComputedStyle(ev.target, null).getPropertyValue("background-color");
	
	// swap
	srcElement.style.backgroundColor = targColor;
	ev.target.style.backgroundColor = srcColor;
	
	colorPalette[srcClass] = rgb2hex(targColor);
	colorPalette[ev.target.className] = rgb2hex(srcColor);
	
	// repaint in scene
	repaint(srcClass);
	repaint(ev.target.className);
}


function repaint(colorPaletteKey) {
	for (var i = 0; i < objects.length; i++) {
		if (objects[i].eventType == colorPaletteKey) {
			repaintColor(objects[i]);	
		}
	}
	
	render();
}

function rgb2hex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
		return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return "0x" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hexToRgb(hex) {
	var bigint = parseInt(hex, 16);
	var r = (bigint >> 16) & 255;
	var g = (bigint >> 8) & 255;
	var b = bigint & 255;

	return ["rgb(",r,",",g,",",b,")"].join("");
}

function c_to_rgb(c) {
	var b = c % 256,
		g_0 = (c % 65536 - b),
		r_0 = c - g_0 - b,
		g = g_0 / 256,
		r = r_0 / 65536;

	return ["rgb(",r,",",g,",",b,")"].join("");
}

function onListClick(element) {

	if (element.id) {
		element.removeAttribute("id");
	} else {
		element.id = "clicked";
	}
	
	var eventType = element.className;
	if (eventType == "purchaseProcessed") eventType = "purchase_processed";
	
	for (var i = 0; i < objects.length; i++) {
		if (objects[i].eventType == eventType) {
			if (element.id) {
				highlight(objects[i]);
			} else {
				objects[i].material.emissive.setHex( objects[i].currentHex );
				objects[i].currentHex = undefined;
			}
			
		}
	}
	
	render();
}

function highlightSession(sessionIndex) {
	if (sessionIndex >= 0) {
		sessionZposition  = squareEdgeSize*(sessionIndex+1) - 25;
		for (var i = 0; i < objects.length; i++) {
			if (objects[i].position.z == sessionZposition && objects[i].geometry.type == "BoxGeometry") {
				highlight(objects[i]);
			}
		}
	}
	render();
}

function removeSessionHighlight(sessionIndex) {
	if (sessionIndex >= 0) {
		sessionZposition  = squareEdgeSize*(sessionIndex+1) - 25;
		for (var i = 0; i < objects.length; i++) {
			if (objects[i].position.z == sessionZposition && objects[i].geometry.type == "BoxGeometry") {
				objects[i].material.emissive.setHex( objects[i].currentHex );
				objects[i].currentHex = undefined;
			}
		}
	}
	render();	
}

function makeOthersOpaque(object, opacityValue) {
	for (var i = 0; i < objects.length; i++) {
		if (objects[i] != object) {
			objects[i].material.transparent = true;
			objects[i].material.opacity = opacityValue;
		} else {
			objects[i].material.opacity = 1;
		}
	}
	render();
}

function highlight(item) {
	item.currentHex = item.material.emissive.getHex();
	item.material.emissive.setHex( 0xff0000 );
}

function repaintColor(item) {
	item.material.color.setHex( colorPalette[item.eventType] );
}

function filter() {
	//var inputElements = document.getElementsByClassName('checkbox');
	var checkedBoxes = document.querySelectorAll('input[class=checkbox]:checked');
	var eventList = [];
	for (var i = 0; i < checkedBoxes.length; i++) {
		eventList.push(checkedBoxes[i].name);
	}
	
	var rangeArray = $('#slider-range-event-count').slider("values");
	var durationRangeArray = $('#slider-range-event-duration').slider("values");
	
	rebuildVisualization(eventList, rangeArray[0], rangeArray[1], durationRangeArray[0], durationRangeArray[1],0);
}

function resizeEvents(size) {
	var scaleVal = size/squareEdgeSize;
	for (var i = 0; i < objects.length; i++) {
		if (objects[i].eventType) {
			objects[i].scale.set(scaleVal,1,scaleVal);
			
		}
	}
	render();
}

// *************************************************************************************************************************************
// --------------------- ADDING LABELS WITH DETAILS UPON CLICK -------------------------
function onDocumentMouseDown( event ) {

	event.preventDefault();

	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

	raycaster.setFromCamera( mouse, camera );

	var intersects = raycaster.intersectObjects( objects );

	if ( intersects.length > 0 ) {

		var intersect = intersects[ 0 ];
		// create label
		if (intersect.object.geometry.type == "BoxGeometry") { 
			var xCoordGrid = Math.floor(intersect.object.position.x/squareEdgeSize);
			var yCoordGrid = Math.floor(intersect.object.position.y/squareEdgeSize);
			var zCoordGrid = Math.floor(intersect.object.position.z/squareEdgeSize);
			
			var name = String('label' + xCoordGrid + yCoordGrid + zCoordGrid);
			selectedLabel = labelScene.getObjectByName(name); 
				
			if (selectedLabel == null) {
				var dataPoint = data[zCoordGrid].clicks[xCoordGrid];
				var labelText = "Event: " + dataPoint.event + "\n" + "Time spent: " + dataPoint.timeSpent + "s\n" 
					+ "Date: " + getDate(dataPoint.eventTime) + "\n" + "Time: " + getTime(dataPoint.eventTime);

				labelScene.add(makeTextLabel( labelText, name, intersect.object.position,
					{ fontsize: 50, borderColor: {r:0, g:0, b:0, a:1.0}, backgroundColor: {r:230, g:242, b:255, a:0.7} } ));

				highlight(intersect.object);
				makeOthersOpaque(intersect.object, 0.4);
				
				
				// position camera
				camera.position.set(intersect.object.position.x-500,(intersect.object.position.y+40)*3, intersect.object.position.z-500);
				controls.target.set(intersect.object.position.x,intersect.object.position.y, intersect.object.position.z);
				controls.update();
				
			} else {
				console.log("removing");
				labelScene.remove(selectedLabel);
				intersect.object.material.emissive.setHex( objects[i].currentHex );
				intersect.object.currentHex = undefined;
				makeOthersOpaque(null, 1);
			}
				
		} 
			
	}

	render();

}

// parses date out of datetime object
function getDate(dateTime) {
	var lines = dateTime.split("T");
	return lines[0];
}

// parses time out of datetime object
function getTime(dateTime) {
	var lines = dateTime.split("T");
	return lines[1].split(".")[0];
}

function makeTextLabel( message, name, position, parameters ) {
	if ( parameters === undefined ) parameters = {};
	
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;
	
	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
		parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
		
	var lineHeight = 80;
	var linesCount = getLinesCount(message);
	
		
	var canvas = document.createElement('canvas');
	canvas.height = lineHeight * linesCount;
	canvas.width = 660;
	var labelContext = canvas.getContext('2d');
	

	labelContext.font = fontsize + "px " + fontface;
	
	// forces to draw rectange big enough for the given text
	var textWidth = getTextWidth(message, labelContext) + 30;

	// background color
	labelContext.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";						
	
	// border color
	labelContext.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";
	
	labelContext.lineWidth = borderThickness;

	roundRect(labelContext, borderThickness/2, borderThickness/2, textWidth + borderThickness, (fontsize * 1.25 * linesCount) + borderThickness, 6);
	// 1.25 is extra height factor for text below baseline: g,j,p,q.
	
	// text color
	labelContext.fillStyle = "rgba(0, 0, 0, 1.0)";

	fillTextMultiLine(labelContext, message, borderThickness + 15, fontsize + borderThickness);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas); 
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture } );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(100,50,1.0);
	sprite.name = name;
	sprite.position.set(position.x,2*position.y + 30,position.z);


	return sprite;	
}

function fillTextMultiLine(ctx, text, x, y) {
	var heightCoef = 1.4;
	
	var lineHeight = ctx.measureText("M").width * heightCoef;
	var lines = text.split("\n");
	for (var i = 0; i < lines.length; ++i) {
		ctx.fillText(lines[i], x, y);
		y += lineHeight;
	}
}

function getTextWidth(text, context) {
	var textWidth = 0;
	
	var lines = text.split("\n");
	for (var i = 0; i < lines.length; i++) {
		var curWidth = context.measureText( lines[i] ).width;
		if (curWidth > textWidth) {
			textWidth = curWidth;
		}
	}
	
	return textWidth;
}

function getLinesCount(text) {
	return text.split("\n").length;
}
	
// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
	var triangleSize = 50; 
	
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.lineTo(x+w-r, y);
	ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	ctx.lineTo(x+w, y+h-r);
	ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);

	// zobacik
	ctx.lineTo((x+r+w/2) + triangleSize, y+h);
	ctx.lineTo((x+r+w/2), y+h+triangleSize);
	ctx.lineTo((x+r+w/2) - triangleSize, y+h);
	ctx.lineTo(x+r, y+h);

	ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	ctx.lineTo(x, y+r);
	ctx.quadraticCurveTo(x, y, x+r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();   
}

// --------------------- ADDING LABELS WITH DETAILS UPON CLICK  END -------------------------
// *************************************************************************************************************************************
// --------------------------------------------- GRID + AXES LABELS ---------------------------------------------

// dynamically creates grid based on size of the dataset
function createGrid3d(scene) {							
	zSize = getNumberOfSessionsToShow() * squareEdgeSize;
	xSize = maxClicks * squareEdgeSize;
	ySize = Math.ceil(maxTimeSpent * 1.2/squareEdgeSize) * squareEdgeSize;
	//console.log(xSize, ySize, zSize);
	
	var geometry = new THREE.Geometry();

	for ( var i = 0; i <= xSize; i += squareEdgeSize ) {
		// spodok
		geometry.vertices.push( new THREE.Vector3( i, 0, 0 ) );
		geometry.vertices.push( new THREE.Vector3( i, 0, zSize ) );
	}
	
	for (var i = 0; i <= zSize; i += squareEdgeSize) {
		// spodok
		geometry.vertices.push( new THREE.Vector3( 0, 0, i ) );
		geometry.vertices.push( new THREE.Vector3( xSize, 0, i ) );
	}
	
	for (var i = 0; i <= ySize; i += squareEdgeSize) {
		// zadna stena
		geometry.vertices.push( new THREE.Vector3( 0, i, zSize) );
		geometry.vertices.push( new THREE.Vector3( xSize, i, zSize) );
	}
	
	for (var i = 0; i <= xSize; i += squareEdgeSize) {
		// zadna stena
		geometry.vertices.push( new THREE.Vector3( i, 0, zSize ) );
		geometry.vertices.push( new THREE.Vector3( i, ySize, zSize ) );
	}
	
	for (var i = 0; i <= zSize; i += squareEdgeSize) {
		// lava stena
		geometry.vertices.push( new THREE.Vector3( xSize, 0, i ) );
		geometry.vertices.push( new THREE.Vector3( xSize, ySize, i ) );
	}
	
	for (var i = 0; i <= ySize; i += squareEdgeSize) {
		// lava stena
		geometry.vertices.push( new THREE.Vector3( xSize, i, 0 ) );
		geometry.vertices.push( new THREE.Vector3( xSize, i, zSize ) );
	}

	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );

	var grid = new THREE.LineSegments( geometry, material );
	scene.add( grid );
}

// label grid axes
function labelAxes() {
	// labels
	var nameX = nameAxis(xSize, ["E","v","e","n","t"],"x");
	scene.add(nameX);
	
	var labelsX = labelAxis(xSize, Array.from(Array(maxClicks).keys()),"x");
	console.log(xSize, maxClicks);
	console.log(ySize, maxTimeSpent);
	scene.add(labelsX);
	
	var nameY = nameAxis(ySize, ["T","I","M","E","(s)"],"y");
	scene.add(nameY);
	
	var labelsY = labelAxis(ySize, Array.from({length: ySize/squareEdgeSize}, (value, key) => key*50),"y");
	scene.add(labelsY);
	
	var nameZ = nameAxis(zSize, ["S","e","s","s","i","o","n"],"z");
	scene.add(nameZ);
	
	var labelsZ = labelAxis(zSize, Array.from(Array(getNumberOfSessionsToShow()).keys()),"z");
	scene.add(labelsZ);
}

function labelAxis(width, data, direction){
	var p;
	
	if (direction=="x"){
		p = {x:-squareEdgeSize/2-10,y:-squareEdgeSize/2,z:-squareEdgeSize/2}
	}
	if (direction=="y"){
		p = {x:xSize,y:0,z:0}
	}
	if (direction=="z"){
		p = {x:-squareEdgeSize-10,y:-squareEdgeSize/2,z:squareEdgeSize}
	}
	
	var separator = width/data.length,
				p,
				dobj = new THREE.Object3D();

	for ( var i = 0; i < data.length; i ++ ) {
			var label = makeTextSprite(data[i]);

			label.position.set(p.x,p.y,p.z);

			dobj.add( label );

			p[direction]+=separator;

	}
	return dobj;
}

function nameAxis(size, data, direction){
	var p;
	var sep = 20;
	
	if (direction=="x"){
		p = {x:size/2,y:-squareEdgeSize,z:-squareEdgeSize}
	}
	if (direction=="y"){
		p = {x:xSize+squareEdgeSize,y:size/2,z:0}
		sep = 25;
	}
	if (direction=="z"){
		p = {x:-2*squareEdgeSize,y:-squareEdgeSize,z:size/2}
	}
	
	var separator = sep,
				p,
				dobj = new THREE.Object3D();

	for ( var i = 0; i < data.length; i ++ ) {
			var label = makeTextSprite(data[i]);

			label.position.set(p.x,p.y,p.z);

			dobj.add( label );
			
			if (direction == "z") {
				p[direction]+=separator;
			} else {
				p[direction]-=separator;
			}
	}
	return dobj;
}

// used to write axes labels
function makeTextSprite(message, opts) {
	var parameters = opts || {};
	var fontface = parameters.fontface || 'Helvetica';
	var fontsize = parameters.fontsize || 70;
	var canvas = document.createElement('canvas');
	var labelContext = canvas.getContext('2d');
	labelContext.font = fontsize + "px " + fontface;

	// get size data (height depends only on font size)
	var metrics = labelContext.measureText(message);
	var textWidth = metrics.width;

	// text color
	labelContext.fillStyle = 'rgba(0, 0, 0, 1.0)';
	labelContext.fillText(message, 0, fontsize);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial({
	map: texture
	});
	var sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(100, 50, 1.0);
	return sprite;
}
// --------------------------------------------- GRID + AXES LABELS END  ---------------------------------------------
// *************************************************************************************************************************************
// --------------------------------------------- OPENGL STUFF - LIGHTS, RENDER ---------------------------------------------------------
// lights of the scene
function createLights(scene) {
	// Lights
	var ambientLight = new THREE.AmbientLight( 0x404040 );
	scene.add( ambientLight );

	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.x = 1;
	directionalLight.position.y = 1;
	directionalLight.position.z = 0.75;
	directionalLight.position.normalize();
	scene.add( directionalLight );

	var directionalLight = new THREE.DirectionalLight( 0x808080 );
	directionalLight.position.x = - 1;
	directionalLight.position.y = 1;
	directionalLight.position.z = - 0.75;
	directionalLight.position.normalize();
	scene.add( directionalLight );
}

// double rendering to make labels always on top
function render() {
	renderer.clear();
	renderer.render( scene, camera );
	renderer.clearDepth();
	renderer.render( labelScene, camera );
}

function renderSessionView() {
	sessionRenderer.clear();
	sessionRenderer.clearDepth();
	sessionRenderer.render( sessionScene, sessionCamera );
	
}

function countSessionTotalTime(sessionIndex) {
	var sum = 0;
	for (var i = 0; i < data[sessionIndex].clicks.length; i++) {
		sum+= data[sessionIndex].clicks[i].timeSpent;
	}
	
	return sum;
}

