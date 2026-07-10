import { apiSlice } from '@/redux/api/apiSlice';

export const userApi = apiSlice.injectEndpoints({
    endpoints(builder) {
        return {
            uploadImage: builder.mutation({
                query: (formData) => ({
                    url: '/users/upload-image',
                    method: 'POST',
                    body: formData,
                }),
                invalidatesTags: ['User'],
            }),
        };
    },
});

export const { useUploadImageMutation } = userApi;
