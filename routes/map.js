const router = require("express").Router();
const mapController = require("../controllers/MapController");

router.post("/update-location", mapController.updateUserLocation);
router.get("/get-all-location", mapController.getAllUserLocation);

module.exports = router;
