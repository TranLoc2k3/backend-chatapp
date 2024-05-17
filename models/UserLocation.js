const dynamoose = require("dynamoose");

const propertiesSchema = new dynamoose.Schema({
  // Tam thoi khong co du lieu, se bo sung neu phat sinh
  IDUser: {
    type: String,
    default: "",
  },
}, { saveUnknown: true });

const geometrySchema = new dynamoose.Schema({
  type: {
    type: String,
    default: "Point",
  },
  coordinates: {
    type: Array,
    schema: [Number],
    default: [0, 0],
  },
}, { saveUnknown: true });

const schema = new dynamoose.Schema({
  ID: {
    type: String,
    hashKey: true,
  },
  type: {
    default: "Feature",
    type: String,
  },
  properties: propertiesSchema,
  geometry: geometrySchema
});

const UserLocation = dynamoose.model("UserLocation", schema);

module.exports = UserLocation;