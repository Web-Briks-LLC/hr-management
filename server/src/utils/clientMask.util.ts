export const maskClientData = (client: any) => {
    if (!client) return client;
    
    // We retain the original _id and clientId, but overwrite name-related fields
    const maskedClient = client.toObject ? client.toObject() : { ...client };
    
    if (maskedClient.clientId) {
        maskedClient.name = maskedClient.clientId;
        maskedClient.companyName = maskedClient.clientId;
    }
    
    maskedClient.emails = [];
    maskedClient.phone = '';
    maskedClient.country = '';
    maskedClient.whatsapp = '';
    maskedClient.skype = '';
    maskedClient.address = '';
    maskedClient.socialMedia = [];
    maskedClient.website = '';
    
    return maskedClient;
};
