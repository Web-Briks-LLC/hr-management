import { auth } from '../lib/auth.js';

async function uploadImageInDB({
    imageUrl,
    headers,
}: {
    imageUrl: string;
    headers: Headers;
}) {
    const updatedUser = await auth.api.updateUser({
        headers: headers,
        body: {
            image: imageUrl,
        },
    });

    return updatedUser;
}

const UserServices = {
    uploadImageInDB,
};

export default UserServices;
