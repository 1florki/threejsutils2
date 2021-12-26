## point octree

<https://1florki.github.io/threejsutils2/octree.js>

```javascript
// IMPORT 
import { Octree } from 'https://1florki.github.io/threejsutils2/octree.js'

// ---
// CREATE

// octree between [-2, -2, -2] and [2, 2, 2]
let oct = new Octree({size: 2}); 
// or
let oct2 = new Octree({min: new THREE.Vector3(0, 0, 0), max: new THREE.Vector3(1, 10, 1)})
// or (will set bounds to encompass points)
let oct3 = new Octree({points: [/* a lot of points */]})


// ---
// INSERT
// add point to octree
let point = new THREE.Vector3(0, 1, 2);
oct.insert(point); 


// ---
// QUERY 
// returns array of points with distance to point <= 0.2
let points = oct.query(point, 0.2); 

// returns true if no other point is within 
// range of point (distance <= 0.1)
let m = oct.minDist(point, 0.1);

// ---
// DEBUG
// returns a mesh, containing a THREE.BoxGeometry 
// for the octree and all children (optional overwrite material)
let mesh = oct.showBoxes(material);

// boxes mesh + points (optional overwrite material)
let mesh2 = oct.show(material)

// get an array of all points
let points = oct.all();

```

using three.js r134
