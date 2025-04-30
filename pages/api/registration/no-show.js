// This endpoint is no longer in use
export default async function handler(req, res) {
  return res.status(410).json({ 
    error: "Gone", 
    message: "This API endpoint has been deprecated and is no longer in use." 
  });
} 