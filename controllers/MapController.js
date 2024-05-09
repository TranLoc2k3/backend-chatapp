const userController = require('./userController');
const UserLocation = require('../models/UserLocation');
const { use } = require('../routes/map');


const getUserLocation = async (IDUser) => {
    const userLocation = await UserLocation.get(IDUser);
    return userLocation;
}

const updateUserLocation = async (req, res) => {
    const { IDUser, longitude, latitude} = req.body;
    const dataUserLocation = await getUserLocation(IDUser);

    if (dataUserLocation) {
        dataUserLocation.geometry.coordinates = [parseFloat(longitude), parseFloat(latitude)];
        await dataUserLocation.save();
        return res.status(200).json({ message: "Update location success" });
    } else {
        const dataUser = userController.getUserByID({body: {username: IDUser}});
        const newUserLocation = new UserLocation({
            ID: IDUser,
            geometry: {
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            properties: {
                IDUser: IDUser,
            },
        });
        await UserLocation.create(newUserLocation);
        return res.status(200).json({ message: "Update location success" });    
    }
}


const getAllUserLocation = async (req, res) => {
    const userLocations = await UserLocation.scan().exec();
    const filteredUserLocations = userLocations.map(userLocation => ({
        ID: userLocation.ID,
        type: userLocation.type,
        geometry: userLocation.geometry,
        properties: userLocation.properties,
      }));
    return res.json(filteredUserLocations);
}

module.exports = {
    updateUserLocation,
    getAllUserLocation,
};