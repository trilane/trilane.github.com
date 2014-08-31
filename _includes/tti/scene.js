/*
 * This is a prototypal Time based scheduler for animations
 * Supporting Tweens and Actions
 * @author https://github.com/zz85/
 *
 * Features:
 *  addAction(time, function)
 *  addTween(time, duration, target_object, start_values, end_values, tween, callback)
 *
 * ChangeLog:
 * ^ .merge() for chaining directors
 * ^ Pause
 * ^ Goto Time
 * ^ Change from start based counter to a running counter.
 *
 * TODO:
 * ^ Added relative timings?
 * ^ ordering of tween/ actions
 * ^ Auto stop once all actions are completed.
 */

THREE.Director = function() {
  this._actions = [];
  this._tweens = [];

  this.easing = {
    linear: function(k) {
      return k;
    },
    cubicInOut: function(k) {
      if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
      return 0.5 * ( ( k -= 2 ) * k * k + 2 );
    },
    cubicEaseIn: function(k) {
      return k * k * k;
    },
    cubicEaseOut: function(k) {
      return --k * k * k + 1;
    }

  }

  if (window.TWEEN && TWEEN.Easing) this.easing = TWEEN.Easing;
};

/*
 * Schedules a tween to run at a particular time
 */
THREE.Director.prototype.addTween = function(startTime, duration,
  object, startValues, endValues, easing, callback) {

    if (startTime===null) startTime = this.__lastTime;
    if (object===null) object = this.__lastObject;
    if (easing==null) easing = this.__lastEasing;
    if (easing==null) easing = 'Linear.EaseNone';
    var easingFunction = this.getEasingFunction(easing);


    object = (object instanceof Array) ? object : [object];
    //Object.prototype.toString.call(o) === '[object Array]'
    this.__lastObject = object;
    this.__lastTime = (startTime + duration)  * 1000;
    this.__lastEasing = easing;

    var tween = {
      startTime: startTime * 1000,
      duration: duration * 1000,
      endTime: this.__lastTime,
      object: object,
      startValues: startValues,
      endValues: endValues,
      easing: easingFunction,
      callback: callback
    };

    this._tweens.push(tween);

    return this;
};

/*
 * Returns easing function based on its string named
 */
THREE.Director.prototype.getEasingFunction = function(name) {

  if (name=="Always.One") {
    return function() {
      return 1;
    }
  } else if (name=="Always.Zero") {
    return function() {
      return 0;
    }
  }


  var pointer = this.easing;;
  var paths = name.split('.');

  for (var i=0; i<paths.length;i++) {
    pointer = pointer[paths[i]];
  }

  if (pointer===undefined) {
    console.log("warning, tween " + name + " not found." )
  }

  return pointer;
};


THREE.Director.prototype.applyTweens = function(currentTime, lastTime) {

  var i, tweens = this._tweens, tween, il;

  // for (i=tweens.length; i--; ) {
  for (i=0, il=tweens.length; i<il; i++) { // Quick patch for ordering
    tween = tweens[i];
      if (tween.startTime <= currentTime && currentTime <= tween.endTime) {

      this.runTween(tween, currentTime);

    } else if ((currentTime > tween.endTime) && (lastTime < tween.endTime)) {

      this.runTween(tween, tween.endTime);

    }
    }


};

THREE.Director.prototype.runTween = function(tween, currentTime) {
  var startTime = tween.startTime,
    duration = tween.duration,
    endTime = tween.endTime,
    objects = tween.object,
    startValues = tween.startValues,
    endValues = tween.endValues,
    easing = tween.easing,
    callback = tween.callback;


  var passedTime = currentTime - startTime;

  var k = easing( passedTime / duration );

  var object;
  for (var i=objects.length;i--;) {
    object = objects[i];

    if (!startValues) {
      // If no start values are specified, use exisiting values
      startValues = {};
    }

    for (var v in endValues) {
      if (!(v in startValues))
        startValues[v] = object[v];
    }

    tween.startValues = startValues;

    var startValue, endValue;
    for (var v in startValues) {
      startValue = startValues[v];
      endValue = endValues[v];
      var value = startValue + k * (endValue - startValue);

      object[v] = value;
    }

    // TODO nested properties

  }

  // Trigger callback
  if (callback) {
    callback(k, object);
  }


};


/*
 * Schedules an action to run at a particular time
 */
THREE.Director.prototype.addAction = function(time, action) {
  this._actions.push({time: time * 1000, action: action});

  // to allow chaining
  return this;
};

// For calculations for video rendering
THREE.Director.prototype.setFps = function(fps) {
  this._fps = fps;
};

THREE.Director.Utils = {
  // Frame to Seconds
  frameToTime: function(frame, fps) {
    return frame / fps;
  },

  timeToFrame: function(time, fps) {
    return Math.floor(time * fps);
  }
};

THREE.Director.prototype.applyActions = function(currentTime, lastTime) {

  // check for past keyframes
  // get all start time and end times in seconds
  var i, il, stage = this._actions, action;

  // for (i=stage.length; i--; ) {
  for (i=0, il=stage.length; i<il;i++) {
    action = stage[i];

      if (action.time > lastTime && action.time<= currentTime) {
      action.action();
    }
    }

};

/*
 *  Playback controls.
 */

THREE.Director.prototype.start = function() {
  var time = Date.now();

  this._lastTime = time; // - 1 Timestamp when last ran
  this._playingTime = 0;

  // run actions at time 0
  this.applyActions(0, -1);

  this._started = true;
};

THREE.Director.prototype.stop = function() {

  this._started = false;
  // reset playing time?
  this._playingTime = 0;
  // Clear last time.
  this._lastTime = null;
};

THREE.Director.prototype.pause = function() {

  this._started = !this._started;
  this._lastTime = Date.now();

};

THREE.Director.prototype.goto = function(t) {

  if (!this._started) return;

  t *= 1000;

  var lastPlayingTime = this._playingTime;

  if (t > lastPlayingTime) {
    this._playingTime = t;

    this.applyActions(t, lastPlayingTime);
    this.applyTweens(t, lastPlayingTime);

  } else {

    this._playingTime = t;

    this.applyActions(t, -1);
    this.applyTweens(t, -1);

  }

};

THREE.Director.prototype.update = function() {

  if (!this._started) return;

  var time = Date.now();
  var elapsed = time - this._lastTime;

  this._lastTime = time;

  var lastPlayingTime = this._playingTime;
  this._playingTime += elapsed;

  this.applyActions(this._playingTime, lastPlayingTime);
  this.applyTweens(this._playingTime, lastPlayingTime);


};

/*
 * Merge another director actions and tweens into the first,
 * while offseting the time
 */
THREE.Director.prototype.merge = function(director2, time) {

  var actions = director2._actions;
  var tweens = director2._tweens;
  time *= 1000;

  var i,il;


  for (i=0,il=actions.length; i<il; i++) {
    actions[i].time += time;
  }

  for (i=0,il=tweens.length; i<il; i++) {
    tweens[i].startTime += time;
    tweens[i].endTime += time;
  }

  this._actions = this._actions.concat(actions);
  this._tweens = this._tweens.concat(tweens);

  return this;

};

var camera, scene, renderer, controls;

var content = document.getElementById("content");
var spacer = document.getElementById("spacer");

// dom
var container = document.createElement('div');
container.style.position="absolute"
container.style.top=0
container.style.left=0
container.style.zIndex = 5
document.body.appendChild(container);

// renderer
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor( 0xffffff, 1);

container.appendChild(renderer.domElement);

// scene
scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, 500, 1700);

// camera
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
scene.add(camera);


// controls
//controls = new THREE.OrbitControls( camera );
//controls.target.x = 400
//controls.target.z = 300
//controls.target.y = 0


// material
var material = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    transparent: true,
    opacity: 1
});

var ceilingMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    transparent: true,
    opacity: 0
});

// material
var thinMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    transparent: true,
    opacity: 0
});

// mesh face materials
var materialFront = new THREE.MeshBasicMaterial( { color: 0x1B325F, transparent: true, opacity: 0 } );
var materialSide = new THREE.MeshBasicMaterial( { color: 0x3A89C9, transparent: true, opacity: 0 } );
var materialArray = [ materialFront, materialSide ];
var starMaterial = new THREE.MeshFaceMaterial(materialArray);

function addPoly(poly, parent, flat) {
  var prismD = flat ? 0 : 40;

  var targetScene = new THREE.Object3D();
  // geometry
  var geometry = new THREE.Geometry();
  // line
  var line = new THREE.Line(geometry, ceilingMaterial); // ceiling/floor are actually mixed up, but meh
  targetScene.add(line);

  var line = new THREE.Line(geometry, material);
  line.position.set(0, 0, prismD);
  targetScene.add(line);

  var xMax = 0
  var yMax = 0

  var xMin = 99999999
  var yMin = 99999999

  function addPoint(x, y) {
      geometry.vertices.push(new THREE.Vector3(x, y, 0));

      var connGeometry = new THREE.Geometry();

      connGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
      connGeometry.vertices.push(new THREE.Vector3(0, 0, prismD));

      var connLine = new THREE.Line(connGeometry, thinMaterial);
      connLine.position.set(x, y, 0);
      targetScene.add(connLine);

      // add mesh point
      points.push(new THREE.Vector2(x, y));

      if(x > xMax) xMax = x;
      if(y > yMax) yMax = y;
      if(x < xMin) xMin = x;
      if(y < yMin) yMin = y;
  }

  var points = [];

  var coords = poly.split(",");
  for(var i = 0; i < coords.length; i += 2) {
    if(coords[i] != coords[i-2] || coords[i+1] != coords[i-1])
      addPoint(parseInt(coords[i]), parseInt(coords[i+1]))
  }

  var starShape = new THREE.Shape( points );

  var extrusionSettings = {
    size: 0, amount: prismD, curveSegments: 0,
    bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
    material: 0, extrudeMaterial: 1
  };

  var centerX = xMin + (xMax - xMin) / 2
  var centerY = yMin + (yMax - yMin) / 2
  var sizeX = xMax - xMin
  var sizeY = yMax - yMin

  var starGeometry = new THREE.ExtrudeGeometry( starShape, extrusionSettings );

  var star = new THREE.Mesh( starGeometry, starMaterial );
  targetScene.add(star);

  var hin   = new THREE.Matrix4().makeTranslation(-centerX, -centerY, -prismD/2)
  var her   = new THREE.Matrix4().makeTranslation(centerX, centerY, prismD/2)
  var spacing = 3
  var scale = 1 - spacing/( (sizeX + sizeY) / 2 )
  var klein = new THREE.Matrix4().makeScale(scale, scale, scale)

  targetScene.matrix = new THREE.Matrix4().multiply(her).multiply(klein).multiply(hin);
  targetScene.matrixAutoUpdate = false;

  parent.add(targetScene);
}

var ug = new THREE.Object3D();
var eg = new THREE.Object3D();
var og1 = new THREE.Object3D();
var og2 = new THREE.Object3D();

data.rooms.forEach(function(room) {
  var floor;

  if(room.floor_id == 19)
    floor = eg;
  if(room.floor_id == 20)
    floor = og1;
  if(room.floor_id == 21)
    floor = og2;
  if(room.floor_id == 22)
    return;
    //floor = ug;

  addPoly(room.polygon, floor, room.din_category!="hnf")
  if(room.floor_id == 20)
    addPoly(room.polygon, ug, room.din_category!="hnf")
})

scene.add(ug)
scene.add(eg)
scene.add(og1)
scene.add(og2)

// axes
//scene.add(new THREE.AxisHelper(100));

// render
function render() {

    renderer.render(scene, camera);

}

var director

var lookAt = new THREE.Vector3(435, 200, 0)


    camera.position = new THREE.Vector3(lookAt.x, lookAt.y, 800);
    eg.traverse( function ( object ) { object.renderDepth = 1; } );
    ug.traverse( function ( object ) { object.renderDepth = 1; } );

    camera.lookAt(lookAt);
    og1.position.z = 100


      var planeW = 50; // pixels
var planeH = 50; // pixels
var numW = 100; // how many wide (50*50 = 2500 pixels wide)
var numH = 100; // how many tall (50*50 = 2500 pixels tall)
var gridMaterial = new THREE.MeshBasicMaterial( { color: 0xCCCCCC, wireframe: true, transparent: true })
var plane = new THREE.Mesh( new THREE.PlaneGeometry( planeW*numW, planeH*numH, numW*2, numH*2 ), gridMaterial);
plane.position.z = og1.position.z - 5
scene.add(plane);


// animate

var running = true
var rendering = true

function animate(t) {
    if(running)
      requestAnimationFrame(animate);
    t = t || 0

/*
    camera.position.x = Math.round(500 + Math.sin(t/1000)*700)
    camera.position.y = Math.round(300 + Math.sin(t/1000)*150)
    camera.position.z = Math.round(650 + Math.sin(t/2000)*450)

    spacing = Math.abs(Math.sin(t/2500))

    ug.position.z = -50 + -300*spacing
    eg.position.z = 0
    og1.position.z = 50 +300*spacing
    og2.position.z = 100 +600*spacing

    camera.lookAt(lookAt);
*/
    //controls.update();

    director.update();

    if(rendering)
      render();

}
var lol = {}
eg.position.z = 99999
ug.position.z = 99999
og2.position.z = 1000
//camera.position.
blackout = document.getElementById("blackout")
music = document.getElementById("music")
indicator = document.getElementById("sound-indicator")

director = new THREE.Director();
director
.addAction(0, function() {
  document.body.style.overflow = "hidden"
  window.scrollTo(0,0)
  indicator.style.opacity = 0.8
})
.addAction(1, function() {
  music.volume = 0.2
  music.play()
})

// drop the curtains
.addTween(1, 0.5, indicator.style, {opacity:0.8}, {opacity:0}, 'linear')
.addTween(0, 10, blackout.style, {opacity:1}, {opacity:0}, 'cubicInOut')
.addAction(14, function() {
  blackout.parentNode.removeChild(blackout)
})

// move these into view only now, when they are white(fog) on white(bg)
.addAction(12, function() {
  eg.position.z = - 2000
  ug.position.z = - 3500
})

// fade in the 2dpolygon-like front faces
.addTween(7,5, materialFront, {opacity: 0}, {opacity: 0.75}, 'linear')

// fade in the 3d edges
.addTween(11,3, ceilingMaterial, {opacity: 0}, {opacity: 1}, 'linear')
.addTween(11,4, thinMaterial, {opacity: 0}, {opacity: 0.4}, 'linear')
.addTween(12,4, materialSide, {opacity: 0}, {opacity: 0.3}, 'linear')

// big reveal: it's 3d! roll in the other floors
.addTween(12, 12, eg.position, {z:-2000}, {z:0}, 'cubicInOut')
.addTween(12, 12, ug.position, {z:-3500}, {z:-100}, 'cubicInOut')
//.addTween(0, 5, ug.position, {z:-800}, {z:-50}, 'cubicInOut')
.addTween(12, 12, og2.position, {z:1000}, {z:200}, 'cubicInOut')

// and move the camera
.addTween(11, 12, camera.position, {y:camera.position.y,x:camera.position.x}, {y:-650,z:400,x:camera.position.x+100}, 'cubicInOut')
.addTween(11, 12, lookAt, {z:lookAt.z}, {z:lookAt.z+10}, 'cubicInOut', function() {
  camera.lookAt(lookAt)
})

.addTween(26, 1, camera.position, {x:camera.position.x+100}, {x:camera.position.x}, 'cubicInOut', function() {
  camera.lookAt(lookAt)
})


.addTween(25, 0.5, og2.rotation, {z: 0}, {z:Math.PI*2/30*3}, 'cubicInOut')
.addTween(25, 0.5, og1.rotation, {z: 0}, {z:Math.PI*2/30*2}, 'cubicInOut')
.addTween(25, 0.5, eg.rotation, {z: 0}, {z:Math.PI*2/30*1}, 'cubicInOut')
.addTween(25, 0.5, ug.rotation, {z: 0}, {z:Math.PI*2/30*0}, 'cubicInOut')

.addTween(27, 0.5, og2.rotation, {z:Math.PI*2/30*3}, {z: 0}, 'cubicInOut')
.addTween(27, 0.5, og1.rotation, {z:Math.PI*2/30*2}, {z: 0}, 'cubicInOut')
.addTween(27, 0.5, eg.rotation, {z:Math.PI*2/30*1}, {z: 0}, 'cubicInOut')
.addTween(27, 0.5, ug.rotation, {z:Math.PI*2/30*0}, {z: 0}, 'cubicInOut')




// as we're getting away, lose the grid
.addTween(23,4, gridMaterial, {opacity: 1}, {opacity: 0}, 'linear')

// fade all the wireframes to white
.addTween(22,4, lol, {opacity: 1}, {opacity: 0}, 'linear', function(k) {
  var grey = ((0xff*k)|0) & 0xff
  var shade = grey << 16 | grey << 8 | grey

  material.color.setHex(shade)
  ceilingMaterial.color.setHex(shade)
  thinMaterial.color.setHex(shade)
})

// .. and goodbye. first, stop rendering new stuff on the canvas
.addAction(27.8, function() {
  rendering = false
})

// then bring in the site content via css
.addAction(29, function() {
  content.classList.remove("out")
  spacer.classList.remove("out")
})

// finally, kill the animation loop (and ourselves)
.addAction(30, function() {
  running = false
  document.body.style.overflow = "auto"
})

.addAction(40, function() {
  music.pause()
})


animate();
music.onloadeddata = function() {
  director.start()
  //director.goto(50)
}
