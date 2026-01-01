import mongoose from 'mongoose';

const UserModel = mongoose.connection.collection('user');
export default UserModel;
