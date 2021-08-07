//------------------------firebase----------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBntUepSNXM7FhJBHUyisYBcJi7vqni54M",
  authDomain: "socialarpublic1.firebaseapp.com",
  databaseURL:
    "https://socialarpublic1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "socialarpublic1",
  storageBucket: "socialarpublic1.appspot.com",
  messagingSenderId: "591109157331",
  appId: "1:591109157331:web:df39e29f2dd19f07b47f26",
  measurementId: "G-W244638TZL",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var storage = firebase.app().storage("gs://socialarpublic1.appspot.com");
var database = firebase.database();
var modelRef = firebase.database().ref("/titech");

//--------------load models------------------------------
window.addEventListener("load", () => {
  modelRef.on("value", (snapshot) => {
    const gltfModels = snapshot.val();
    console.dir(gltfModels);
    createEntities(gltfModels);
    document.getElementById("uploadNewModel").addEventListener("click", () => {
      newModelUploadAndAdd(gltfModels);
    });
  });
});

//---------------------Cesium 基本設定----------------------------------------
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxOWNiZmM2OC1mMzA4LTRlM2UtOTc0OS1jNWMwYjk4MzM2YmQiLCJpZCI6NTg3MjUsImlhdCI6MTYyNzgzMDkyNn0.eXZA6FknYoWPrVWC3bUIePW_tnIeVnkJaci4Uq1Qgak";
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: new Cesium.CesiumTerrainProvider({
    url: Cesium.IonResource.fromAssetId(529292),
  }),
  //   terrainProvider : new Cesium.ArcGISTiledElevationTerrainProvider({
  //     url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
  // }),
  imageryProvider: new Cesium.OpenStreetMapImageryProvider({
    url: "https://a.tile.openstreetmap.org/",
  }),
  infoBox: false,
  shadows: true,
  shouldAnimate: true,
  geocoder: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  homeButton: false,
});
viewer.scene.globe.depthTestAgainstTerrain = true;
var tileset1 = viewer.scene.primitives.add(
  new Cesium.Cesium3DTileset({
    url: Cesium.IonResource.fromAssetId(510091),
  })
);
var tileset2 = viewer.scene.primitives.add(
  new Cesium.Cesium3DTileset({
    url: Cesium.IonResource.fromAssetId(510093),
  })
);
var tileset3 = viewer.scene.primitives.add(
  new Cesium.Cesium3DTileset({
    url: Cesium.IonResource.fromAssetId(510456),
  })
);

var initialPosition = new Cesium.Cartesian3.fromDegrees(
  139.6864690639537,
  35.603949084082174,
  300
);
var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
  -27.1077496389876024807,
  -41.987223091598949054,
  0.025883251314954971306
);
var homeCameraView = {
  destination: initialPosition,
  orientation: {
    heading: initialOrientation.heading,
    pitch: initialOrientation.pitch,
    roll: initialOrientation.roll,
  },
};
// Override the default home button
// viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (
//   e
// ) {
//   e.cancel = true;
//   viewer.scene.camera.flyTo(homeCameraView);
// });

viewer.camera.flyTo({
  destination: initialPosition,
  orientation: initialOrientation,
  duration: 3,
});

// ------------- adding abalable model list at add model ------------------
storage
  .ref("/3Dmodel")
  .listAll()
  .then((res) => {
    console.log(res);
    res.items.forEach((ref) => {
      modelname = ref.name;
      const addModelButton = document.createElement("button");
      addModelButton.innerHTML = modelname;
      addModelButton.id = `addButton${modelname}`;
      addModelButton.addEventListener("click", () => {
        add3Dmodel(data, modelname);
      });
      document.getElementById("addModelButtons").appendChild(addModelButton);
    });
  });

//--------make entitis from firebase realtime database-----------
function createEntities(data) {
  console.log("createentity", data);
  for (const ID in data) {
    let gltf = data[ID];
    let x = gltf.location.longitude;
    let y = gltf.location.latitude;
    let terrainProvider = viewer.terrainProvider;
    var heading = Cesium.Math.toRadians(90);
    let pitch = 0;
    let roll = 0;
    let hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

    // List でないとダメ！！！！！！
    let positions = [Cesium.Cartographic.fromDegrees(x, y)];
    let promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    Cesium.when(promise, function (updatedPositions) {
      console.log(updatedPositions);
      let height = gltf.location.height + updatedPositions[0].height;
      let position = Cesium.Cartesian3.fromDegrees(x, y, height);
      console.log(position);
      var orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        hpr
      );
      let ref = storage.ref(`/3Dmodel/${gltf.model}.gltf`).getDownloadURL();
      ref.then((url) => {
        if (viewer.entities.getById(ID)) {
          console.log(viewer.entities.getById(ID));
          entity = viewer.entities.getById(ID);
          entity.name = gltf.name;
          entity.position = position;
          entity.model.uri = url;
          entity.dataRef = gltf;
        } else {
          viewer.entities.add({
            id: ID,
            name: gltf.name,
            position: position,
            orientation: orientation,
            model: {
              uri: url,
            },
            label: {
              text: `${gltf.name}`,
              font: "14pt monospace",
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 4,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -9),
              show: gltf.label,
              sizeInMeters: true,
            },
            dataRef: gltf,
          });
        }
        // if (document.getElementById(`addButton${gltf.model}`)) {
        // } else {
        //   const addModelButton = document.createElement("button");
        //   addModelButton.innerHTML = gltf.model;
        //   addModelButton.id = `addButton${gltf.model}`;
        //   addModelButton.addEventListener("click", () => {
        //     add3Dmodel(data, gltf.model);
        //   });
        //   document
        //     .getElementById("addModelButtons")
        //     .appendChild(addModelButton);
        // }
        if (document.getElementById(`entityListID${ID}`)) {
        } else {
          let modelListContainer =
            document.getElementById("modelListContainer");
          let entityButton = document.createElement("tr");
          entityButton.id = `entityListID${ID}`;
          entityButton.className = "entityButton";
          let entityName = document.createElement("td");
          entityName.innerHTML = gltf.name;
          let entityModel = document.createElement("td");
          entityModel.innerHTML = gltf.model;
          entityButton.appendChild(entityName);
          entityButton.appendChild(entityModel);
          entityButton.addEventListener("click", () => {
            viewer.flyTo(viewer.entities.getById(ID));
          });
          modelListContainer.appendChild(entityButton);
        }
      });
    });
  }
}

//---------------3dmodel が選択された時の操作------------------------
//entityに情報を載せて送る
function pickEntity(viewer, windowPosition) {
  var picked = viewer.scene.pick(windowPosition);
  if (Cesium.defined(picked)) {
    var entity = Cesium.defaultValue(picked.id, picked.primitive.id);
    if (entity instanceof Cesium.Entity) {
      let id = entity.id;
      console.dir(entity.dataRef);
      console.log(entity.model.uri.getValue());
      console.log(entity.id);
      // console.log(entity.position);
      // let cartesian = entity.position.getValue();
      // var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      let gltf = entity.dataRef;
      document.getElementById("modelId").innerHTML = id;
      document.getElementById("modelName").value = gltf.name;
      document.getElementById("modelLatitude").value = gltf.location.latitude;
      document.getElementById("modelLongitude").value = gltf.location.longitude;
      document.getElementById("modelHeight").value = gltf.location.height;
      document.getElementById("modelLabel").checked = gltf.label;
      document.getElementById("modelDistance").checked = gltf.distance;
      document.getElementById("modelLink").value = gltf.link;
      document.getElementById("modelCaption").value = gltf.caption;
      let url = entity.model.uri.getValue();
      let oldel = document.getElementById("viewerModel");
      let newel = document.createElement("a-entity");
      newel.setAttribute("id", "viewerModel");
      newel.setAttribute("gltf-model", `url(${url})`);
      newel.setAttribute("animation-mixer", "");
      newel.setAttribute("response-type", "arraybuffer");
      let scene = document.querySelector("a-scene");
      scene.replaceChild(newel, oldel);
      if (gltf.label) {
        let labeltext = document.getElementById("viewerModelLabel");
        labeltext.setAttribute("value", gltf.name);
      } else {
        let labeltext = document.getElementById("viewerModelLabel");
        labeltext.setAttribute("value", "");
      }
      if (gltf.distance) {
        let labeltext = document.getElementById("viewerModelDistance");
        labeltext.setAttribute("value", "10m");
      } else {
        let labeltext = document.getElementById("viewerModelDistance");
        labeltext.setAttribute("value", "");
      }
      let modelViewer = document.getElementById("nowModel");
      if (modelViewer.classList.contains("active")) {
      } else {
        document.getElementById("nowModel").click();
      }
    }
  }
}

function flyToSelectedModel() {
  if (document.getElementById("modelId").innerHTML) {
    let id = document.getElementById("modelId").innerHTML;
    let entity = viewer.entities.getById(id);
    viewer.flyTo(entity);
  }
}

viewer.scene.canvas.addEventListener("click", function (event) {
  pickEntity(viewer, event);
});
//---------------モデルの情報を変えたとき-----------------------
function changeModelProperty() {
  let id = document.getElementById("modelId").innerHTML;
  let modelname = document.getElementById("modelName").value;
  let latitude = parseFloat(document.getElementById("modelLatitude").value);
  let longitude = parseFloat(document.getElementById("modelLongitude").value);
  let height = parseFloat(document.getElementById("modelHeight").value);
  // let entity = viewer.entities.getById(id);
  //------- firebase 側がレンダリングを自動でしてくれる
  // let terrainProvider = Cesium.createWorldTerrain();
  // // List でないとダメ！！！！！！
  // let positions = [Cesium.Cartographic.fromDegrees(longitude, latitude)];
  // let promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
  // Cesium.when(promise, function (updatedPositions) {
  //   console.log(updatedPositions);
  //   let updateheight = height + updatedPositions[0].height;
  //   let finalposition = Cesium.Cartesian3.fromDegrees(
  //     longitude,
  //     latitude,
  //     updateheight
  //   );
  //   entity.position = finalposition;

  //-------realtimedatabase の方も変更-----------------
  modelRef.child(`/${id}`).update({
    name: modelname,
    location: {
      latitude: latitude,
      longitude: longitude,
      height: height,
    },
  });
  // });
}

//-------------------その他の情報を変えたとき-----------------
function changeModelData() {
  if (document.getElementById("modelId").innerHTML) {
    let id = document.getElementById("modelId").innerHTML;
    let name = document.getElementById("modelName").value;
    let label = document.getElementById("modelLabel").checked;
    let distance = document.getElementById("modelDistance").checked;
    let link = document.getElementById("modelLink").value;
    let caption = document.getElementById("modelCaption").value;
    if (label) {
      let labeltext = document.getElementById("viewerModelLabel");
      labeltext.setAttribute("value", name);
      let entity = viewer.entities.getById(id);
      entity.label.show = true;
    } else {
      let labeltext = document.getElementById("viewerModelLabel");
      labeltext.setAttribute("value", "");
      let entity = viewer.entities.getById(id);
      entity.label.show = false;
    }
    if (distance) {
      let labeltext = document.getElementById("viewerModelDistance");
      labeltext.setAttribute("value", "10m");
    } else {
      let labeltext = document.getElementById("viewerModelDistance");
      labeltext.setAttribute("value", "");
    }
    modelRef.child(`/${id}`).update({
      label: label,
      distance: distance,
      link: link,
      caption: caption,
    });
  }
}

//--------削除ボタン押したとき--------------
document.getElementById("deleteModel").addEventListener("click", () => {
  if (document.getElementById("modelId").innerHTML) {
    let id = document.getElementById("modelId").innerHTML;
    modelRef.child(`/${id}`).remove();
    let entity = viewer.entities.getById(`${id}`);
    viewer.entities.remove(entity);
  }
});

// ------緯度経度表示マーカーを先に作ってこいつを移動させる------------
viewer.pickTranslucentDepth = true;
const locationMarker = viewer.entities.add({
  name: "location",
  point: {
    pixelSize: 10,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },
  label: {
    text: "check",
    font: "14pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 4,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -9),
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },
});

document.getElementById("copyLatLon").addEventListener("click", () => {
  if (document.getElementById("mousePositionLatitude").innerHTML) {
    document.getElementById("modelLatitude").value = document.getElementById(
      "mousePositionLatitude"
    ).innerHTML;
    document.getElementById("modelLongitude").value = document.getElementById(
      "mousePositionLongitude"
    ).innerHTML;
    document.getElementById("modelLongitude").onchange();
  }
});

//----------------------- mouse position--------------------------
viewer.scene.canvas.addEventListener("contextmenu", function (event) {
  // var entity = viewer.entities.getById("mou");
  event.preventDefault();
  const mousePosition = new Cesium.Cartesian2(event.clientX, event.clientY);
  const selectedLocation = viewer.scene.pickPosition(mousePosition);
  const cartio = Cesium.Cartographic.fromCartesian(selectedLocation);
  console.log(cartio);
  if (cartio) {
    var longitudeString = Cesium.Math.toDegrees(cartio.longitude);
    var latitudeString = Cesium.Math.toDegrees(cartio.latitude);
    document.getElementById("mousePositionLatitude").innerHTML = latitudeString;
    document.getElementById("mousePositionLongitude").innerHTML =
      longitudeString;
    locationMarker.position = selectedLocation;
    locationMarker.label.text =
      "(" + latitudeString + ", " + longitudeString + ")";
  } else {
    return;
  }
});

function latlonDisplay() {
  if (document.getElementById("latlonDisplay").checked) {
    locationMarker.label.show = true;
  } else {
    locationMarker.label.show = false;
  }
}

//-------------- collaps menu bar ---------
var coll = document.getElementsByClassName("collapsible");
var colli;

for (colli = 0; colli < coll.length; colli++) {
  coll[colli].addEventListener("click", function () {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
}

//--------------------adding new 3dmodel-------------------
function add3Dmodel(data, modelName) {
  let newId =
    Math.max(...Object.keys(data).map((str) => parseInt(str, 10))) + 1;
  let ref = storage.ref(`/3Dmodel/${modelName}.gltf`).getDownloadURL();
  console.log("pushed");
  ref.then((url) => {
    if (document.getElementById("mousePositionLongitude").innerHTML) {
      let positionLatitude = parseFloat(
        document.getElementById("mousePositionLatitude").innerHTML
      );
      let positionLongitude = parseFloat(
        document.getElementById("mousePositionLongitude").innerHTML
      );
      // ----- firebaseがやってくれる----------------
      // let positions = [
      //   Cesium.Cartographic.fromDegrees(positionLongitude, positionLatitude),
      // ];
      // let promise = Cesium.sampleTerrainMostDetailed(
      //   viewer.terrainProvider,
      //   positions
      // );
      // Cesium.when(promise, function (updatedPositions) {
      //   let height = updatedPositions[0].height;
      //   let addingLocation = Cesium.Cartesian3.fromDegrees(
      //     positionLongitude,
      //     positionLatitude,
      //     height
      //   );
      let dataRef = {
        name: "New 3DObject",
        location: {
          latitude: positionLatitude,
          longitude: positionLongitude,
          height: 10,
        },
        model: modelName,
        label: false,
        minDistance: 0,
        maxDistance: 0,
        distance: false,
        caption: "",
        link: "",
      };

      modelRef
        .child(`/${newId}`)
        .set(dataRef)
        .then(() => {
          viewer.flyTo(viewer.entities.getById(`${newId}`));
        });

      // });
    } else {
      let centerx = document.documentElement.clientWidth / 2;
      let centery = document.documentElement.clientHeight / 2;
      let screenCenterPosition = new Cesium.Cartesian2(centerx, centery);
      let addingLocation = viewer.scene.pickPosition(screenCenterPosition);
      let cartographic = Cesium.Cartographic.fromCartesian(addingLocation);
      let positionLongitude = Cesium.Math.toDegrees(cartographic.longitude);
      let positionLatitude = Cesium.Math.toDegrees(cartographic.latitude);
      let dataRef = {
        name: "New 3DObject",
        location: {
          latitude: positionLatitude,
          longitude: positionLongitude,
          height: 0,
        },
        model: modelName,
        label: false,
        minDistance: 0,
        maxDistance: 0,
        distance: false,
        caption: "",
        link: "",
      };
      modelRef.child(`/${newId}`).set(dataRef);
    }
  });
}

//-------------------------adding new 3dmodel-----------------------------
function onFileSelect(inputElement) {
  let newModelName = document.getElementById("newModelName");
  let filename = inputElement.files[0].name.match(/([^/]*)\./)[1];
  newModelName.value = filename;
}

function newModelUploadAndAdd(data) {
  if (document.getElementById("newModelName").value) {
    console.log("pushed upload");
    let gltfInput = document.getElementById("gltfInput");
    let newModelName = document.getElementById("newModelName").value;
    const gltf = gltfInput.files[0];
    storage
      .ref(`/3Dmodel/${newModelName}.gltf`)
      .put(gltf)
      .then(
        (snapshot) => {
          console.log("on progress");

          var progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
          add3Dmodel(data, newModelName);
        },
        (error) => {
          console.log(error);
        }
      );
  }
}

//------------infoBox で操作しようとした残骸---------------
// viewer.infoBox.frame.removeAttribute("sandbox");
// viewer.infoBox.frame.src = "about:blank";
// console.log(viewer.infoBox.frame);

// function entityDescription(model) {
//   let x = model.location.lng;
//   let y = model.location.lat;
//   let url = `./src/assets/${model.model_type}/${model.model_type}.gltf`;
//   let description = url;
//   // `<iframe
//   //       src="http://127.0.0.1:5500/ARArrangementUI/src/modelbox.html"
//   //       frameborder="0"
//   //     ></iframe>`;

//   //   `<script src="https://aframe.io/releases/1.2.0/aframe.min.js"></script>
//   //   <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js"></script>
//   //   <script src="https://unpkg.com/aframe-orbit-controls@1.2.0/dist/aframe-orbit-controls.min.js"></script>
//   //     `<a-scene vr-mode-ui="enabled: false">
//   //     <a-assets>
//   //       <a-asset-item id="pin" src="./assets/pin/pin.gltf"></a-asset-item>
//   //     </a-assets>
//   //     <a-sky color="#ECECEC"></a-sky>
//   //     <a-entity
//   //       camera
//   //       look-controls
//   //       orbit-controls="target: 0 1.6 -0.5; minDistance: 0.5; maxDistance: 180; initialPosition: 0 5 15"
//   //     ></a-entity>
//   //   </a-scene>

//   // <script>
//   //   var scene = document.querySelector("a-scene");
//   //   let model = document.createElement("a-entity");
//   //   var model_type = "pin";
//   //   model.setAttribute(
//   //     "gltf-model",
//   //     ${url}
//   //   );
//   //   model.setAttribute("animation-mixer", "");
//   //   model.setAttribute("response-type", "arraybuffer");

//   //   scene.appendChild(model);
//   // </script>
//   //    `;
//   return description;
// }
