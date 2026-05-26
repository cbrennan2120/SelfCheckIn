// -----------------------------------------------------------------
// Netlify Serverless Function: Securely Save User Logs & Biometrics
// -----------------------------------------------------------------

const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  // Initialize the Netlify Blobs environment in Lambda compatibility mode
  connectLambda(event);

  const user = context.clientContext && context.clientContext.user;
  
  if (!user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized. Please log in first." })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed. Use POST." })
    };
  }

  const userId = user.sub; // Secure, verified unique user ID
  
  try {
    const payload = JSON.parse(event.body);
    
    if (!payload.checkins || !payload.biometrics) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid payload. 'checkins' and 'biometrics' arrays are required." })
      };
    }

    const store = getStore("selfcoach_logs_v3");
    
    // Package and save the data securely
    const dataToSave = {
      checkins: payload.checkins,
      biometrics: payload.biometrics
    };

    await store.set(userId, JSON.stringify(dataToSave));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Logs synced to Netlify Cloud successfully!" })
    };
  } catch (error) {
    console.error("Error saving user blobs: ", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error saving logs." })
    };
  }
};
