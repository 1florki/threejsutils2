import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports,min/optimized/three.js';


// simple octree (THREE.js version)
/*

// usage: 

// Octree(opts)
opts: {
- size s (bounds from [-s, -s, -s] to [s, s, s])
- bounds (clone Box3)
- min, max (vec3 for Box3 min, max)
- points: [vec3] (if no other option given, will set bounds to encompass all points, will add points to tree)

- cap (max number of points before tree is split)
}

let oct = new Octree(); // octree between (-1, -1, -1) and (1, 1, 1)
let oct2 = Octree.withSize(5) // octree between (-5, -5, -5) and (5, 5, 5)
let oct3 = new Octree() // octree between (0, 0, 0) and (10, 10, 10)


// insert(pos, data)

oct.insert(pos, "test")
oct.insertXYZ(1, 2, 3, {hello: "world"}) // adds a point at (1, 2, 3)
oct.insertPoint(new THREE.Vector3(2, 5, 7)) // adds a point at (2, 5, 7)


// query(pos, maxDist)

// O(log(n))

let points = oct.query(pos, 0.5) // returns an array with {point: p, data: d} objects around pos (max dist 0.5)
let points = oct.queryBox(new THREE.Box3()); // returns array with points (and data) in box 

*/

export class Octree {
  constructor(opts) {
    opts = opts || {};
    
    this.points = [];
    
    if(opts.bounds) {
      this.boundary = opts.bounds.clone();
    } else if(opts.size) {
      let s = opts.size;
      this.boundary = new THREE.Box3(new THREE.Vector3(-s, -s, -s), new THREE.Vector3(s, s, s))
    } else if(opts.min || opts.max) {
      min = opts.min || new THREE.Vector3(-1, -1, -1);
      max = opts.max || new THREE.Vector3(1, 1, 1);
      this.boundary = new THREE.Box3(min, max)
    } else if(opts.points && opts.points.length > 0) {
      let min = opts.points[0].clone();
      let max = opts.points[0].clone();
      for(let p of opts.points) {
        min.x = Math.min(min.x, p.x);
        min.y = Math.min(min.y, p.y);
        min.z = Math.min(min.z, p.z);

        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
        max.z = Math.max(max.z, p.z);
      }
      this.boundary = new THREE.Box3(min, max);
    } else {
      this.boundary = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    }
    
  
    this.capacity = opts.cap || 4;
    
    if(opts.points) {
      for(let p of opts.points) {
        this.insertXYZ(p.x, p.y, p.z);
      }
    }
  }
  
  subdivide() {
    // if already subdivided exit silently
    if(this.subdivisions != undefined) return;
    
    // divide each dimension => 2 * 2 * 2 = 8 subdivisions
    let size = new THREE.Vector3();
    let subdivisions = [];
    for(let x = 0; x < 2; x++) {
      for(let y = 0; y < 2; y++) {
        for(let z = 0; z < 2; z++) {
          let min = this.boundary.min.clone();
          let max = this.boundary.max.clone();
          this.boundary.getSize(size);
          size.divideScalar(2);
          min.x += x * size.x;
          min.y += y * size.y;
          min.z += z * size.z;
          max.x -= (1 - x) * size.x;
          max.y -= (1 - y) * size.y;
          max.z -= (1 - z) * size.z;
          subdivisions.push(new Octree({min: min, max: max, cap: this.capacity}));
        }
      }
    }
    this.subdivisions = subdivisions;
  }
  
  // returns array of points where 
  // distance between pos and point is less than dist
  query(pos, dist = 1) {
    let points = this.queryXYZ(pos.x, pos.y, pos.z, dist);
    for(let i = points.length - 1; i >= 0; i--) {
      if(points[i].point.distanceTo(pos) > dist) points.splice(i, 1);
    }
    return points;
  }
  // vector3 free version, returns points in box around xyz
  queryXYZ(x, y, z, s) {
    let min = new THREE.Vector3(x - s, y - s, z - s), max = new THREE.Vector3(x + s, y + s, z + s)
    let box = new THREE.Box3(min, max);
    return this.queryBox(box);
  }
  queryBox(box, found) {
    found = found || [];
    
    if(!box.intersectsBox(this.boundary)) return found;
    
    for(let p of this.points) {
      if(box.containsPoint(p)) found.push(p);
    }
    if(this.subdivisions) {
      for(let sub of this.subdivisions) {
        sub.queryBox(box, found);
      }
    }
    return found;
  }
  
  // returns true if no points are closer than dist to point
  minDist(pos, dist) {
    return (this.query(pos, dist).length < 1);
  }
  
  // insert point with optional data (sets vec.data = data)
  insert(pos, data) {
    return this.insertPoint(pos, data);
  }
  // vector3 free version
  insertXYZ(x, y, z, data) {
    return this.insertPoint(new THREE.Vector3(x, y, z), data);
  }
  insertPoint(p, data) {
    p = p.clone();
    if(data) p.data = data;
    if(!this.boundary.containsPoint(p)) return false;
    
    if(this.points.length < this.capacity) {
      this.points.push(p);
      return true;
    } else {
      this.subdivide();
      let added = false;
      for(let sub of this.subdivisions) {
        if(sub.insertPoint(p, data)) added = true;
      }
      return added;
    }
  }
  
  showBoxes(mat, parent) {
    let size = new THREE.Vector3();
    this.boundary.getSize(size);
    
    let box = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    let mesh = new THREE.Mesh(box, mat || new THREE.MeshStandardMaterial({wireframe: true}));
    this.boundary.getCenter(mesh.position);
    
    parent = parent || new THREE.Object3D();
    parent.add(mesh);
    
    if(this.subdivisions) {
      for(let sub of this.subdivisions) sub.showBoxes(mat, parent);
    }
    return parent;
  }
  show(mat) {
    mat = mat || new THREE.MeshStandardMaterial({transparent: true, opacity: 0.3});
    let boxes = this.showBoxes(mat);
    let points = this.allPoints(true);
    
    let pointsGeo = new THREE.BufferGeometry();
    let positionData = new Float32Array(points.length * 3);
    
    for(let i = 0; i < points.length; i++) {
      positionData[i * 3] = points[i].x;
      positionData[i * 3 + 1] = points[i].y;
      positionData[i * 3 + 2] = points[i].z;
    }
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positionData, 3));
    let pointMesh = new THREE.Points(pointsGeo, new THREE.PointsMaterial({size: 1, sizeAttenuation: false}));
    boxes.add(pointMesh);
    return boxes;
  }
  all(arr) {
    arr = arr || [];
    for(let p of this.points) {
      arr.push(p);
    }
    if(this.subdivisions) {
      for(let subs of this.subdivisions) subs.allPoints(arr);
    }
    return arr;
  }
}
