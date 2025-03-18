export const fetchMetadata = async (
    fetchMetadataAPIUrl: string,
    url: string,
) => {
    const response = await fetch(`${fetchMetadataAPIUrl}?url=${url}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.json();
};
