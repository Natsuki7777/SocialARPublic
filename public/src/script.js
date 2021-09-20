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
    add3db(gltfModels);
  });
});

function add3db(gltfModels) {
  storage
    .ref("/3Dmodel")
    .listAll()
    .then((res) => {
      console.log(res);
      res.items.forEach((ref) => {
        let modelname = ref.name;
        if (document.getElementById(`addButton${modelname}`)) {
        } else {
          const addModelButton = document.createElement("button");
          addModelButton.innerHTML = modelname;
          addModelButton.id = `addButton${modelname}`;
          addModelButton.addEventListener("click", () => {
            add3Dmodel(gltfModels, modelname);
          });
          document
            .getElementById("addModelButtons")
            .appendChild(addModelButton);
        }
      });
    });
}
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
  shadows: false,
  shouldAnimate: true,
  geocoder: true,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  animation: true,
  timeline: true,
  homeButton: true,
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
  139.83553837295884,
  35.474996810820514,
  50000
);
var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(0, -70, 0);
var homeCameraView = {
  destination: initialPosition,
  orientation: {
    heading: initialOrientation.heading,
    pitch: initialOrientation.pitch,
    roll: initialOrientation.roll,
  },
};
// Override the default home button
viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (
  e
) {
  e.cancel = true;
  viewer.scene.camera.flyTo(homeCameraView);
});

viewer.camera.flyTo({
  destination: initialPosition,
  orientation: initialOrientation,
  duration: 3,
});

// ------------- adding abalable model list at add model ------------------

//--------make entitis from firebase realtime database-----------
function createEntities(data) {
  console.log("createentity", data);
  for (const ID in data) {
    let gltf = data[ID];
    let x = gltf.location.longitude;
    let y = gltf.location.latitude;
    let terrainProvider = viewer.terrainProvider;

    let rotation = gltf.rotation;
    console.log(gltf);
    //! -----おそらくここでバグるから注意
    let heading = Cesium.Math.toRadians(90 + rotation.z);
    let pitch = Cesium.Math.toRadians(rotation.x);
    let roll = Cesium.Math.toRadians(rotation.y);
    let hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

    let scale = gltf.scale;

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
          entity.orientation = orientation;
          entity.model.uri = url;
          entity.model.scale = scale.x;
          entity.dataRef = gltf;
        } else {
          viewer.entities.add({
            id: ID,
            name: gltf.name,
            position: position,
            orientation: orientation,
            model: {
              uri: url,
              scale: scale.x,
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
            showOnViewer(ID);
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
      showOnViewer(id);
    }
  }
}

function showOnViewer(id) {
  let entity = viewer.entities.getById(id);
  let gltf = entity.dataRef;
  document.getElementById("modelId").innerHTML = id;
  document.getElementById("modelName").value = gltf.name;
  document.getElementById("modelLatitude").value = gltf.location.latitude;
  document.getElementById("modelLongitude").value = gltf.location.longitude;
  document.getElementById("modelHeight").value = gltf.location.height;
  document.getElementById("modelrotationx").value = gltf.rotation.x;
  document.getElementById("modelrotationy").value = gltf.rotation.y;
  document.getElementById("modelrotationz").value = gltf.rotation.z;
  document.getElementById("modelscale").value = gltf.scale.x;

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
  let rotation = {
    x: parseFloat(document.getElementById("modelrotationx").value),
    y: parseFloat(document.getElementById("modelrotationy").value),
    z: parseFloat(document.getElementById("modelrotationz").value),
  };
  let scale = {
    x: parseFloat(document.getElementById("modelscale").value),
    y: parseFloat(document.getElementById("modelscale").value),
    z: parseFloat(document.getElementById("modelscale").value),
  };

  //-------realtimedatabase の方も変更-----------------
  modelRef.child(`/${id}`).update({
    name: modelname,
    location: {
      latitude: latitude,
      longitude: longitude,
      height: height,
    },
    rotation: {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    },
    scale: {
      x: scale.x,
      y: scale.y,
      z: scale.z,
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
    document.getElementById(`entityListID${id}`).remove();
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
function add3Dmodel(data, model) {
  modelName = model.slice(0, -5);
  console.log(modelName);
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
      let dataRef = {
        name: "New 3DObject",
        location: {
          latitude: positionLatitude,
          longitude: positionLongitude,
          height: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
        scale: {
          x: 1.0,
          y: 1.0,
          z: 1.0,
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
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
        scale: {
          x: 1.0,
          y: 1.0,
          z: 1.0,
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

function newModelUploadAndAdd(gltfModels) {
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
          add3db(gltfModels);
        },
        (error) => {
          console.log(error);
        }
      );
  }
}
