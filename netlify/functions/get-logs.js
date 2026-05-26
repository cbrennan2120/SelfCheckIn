// -----------------------------------------------------------------
// Netlify Serverless Function: Securely Get User Logs & Biometrics
// -----------------------------------------------------------------

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  // Netlify Identity automatically parses the JWT and places the verified user object in context
  const user = context.clientContext && context.clientContext.user;
  
  if (!user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized. Please log in first." })
    };
  }

  const userId = user.sub; // Secure, verified unique user ID
  
  try {
    const store = getStore("selfcoach_logs_v3");
    const rawData = await store.get(userId);
    
    if (!rawData) {
      // If new user, return empty baseline arrays
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkins: [], biometrics: [] })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: rawData
    };
  } catch (error) {
    console.error("Error retrieving user blobs: ", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error retrieving logs." })
    };
  }
};
