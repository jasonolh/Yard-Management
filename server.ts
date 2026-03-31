import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import https from "https";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/monday/jobs", (req, res) => {
    const data = JSON.stringify({
      query: `query { boards(ids: 5085312780) { name columns { id title type } items_page(limit: 50) { items { id name group { id title } column_values { id text } } } } }`
    });

    const apiKey = process.env.MONDAY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MONDAY_API_KEY environment variable is not set" });
    }

    const options = {
      hostname: 'api.monday.com',
      path: '/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2024-01'
      }
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => {
        try {
          res.json(JSON.parse(body));
        } catch (e) {
          console.error("Failed to parse monday.com response (Jobs):", body);
          res.status(500).json({ error: "Failed to parse monday.com response" });
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy();
      res.status(504).json({ error: "Monday.com Jobs API request timed out" });
    });

    request.on('error', (e) => {
      console.error("Monday.com Jobs API Error:", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: `Monday.com Jobs API Error: ${e.message}` });
      }
    });
    
    request.write(data);
    request.end();
  });

  app.get("/api/monday/tyrebay", (req, res) => {
    const data = JSON.stringify({
      query: `query { boards(ids: 1565754578) { columns { id title } items_page(limit: 100) { items { id name group { id title } column_values { id text } } } } }`
    });

    const apiKey = process.env.MONDAY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MONDAY_API_KEY environment variable is not set" });
    }

    const options = {
      hostname: 'api.monday.com',
      path: '/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2024-01'
      }
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => {
        try {
          res.json(JSON.parse(body));
        } catch (e) {
          console.error("Failed to parse monday.com response (Tyre Bay):", body);
          res.status(500).json({ error: "Failed to parse monday.com response" });
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy();
      res.status(504).json({ error: "Monday.com Tyre Bay API request timed out" });
    });

    request.on('error', (e) => {
      console.error("Monday.com Tyre Bay API Error:", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: `Monday.com Tyre Bay API Error: ${e.message}` });
      }
    });
    
    request.write(data);
    request.end();
  });

  app.post("/api/monday/move", (req, res) => {
    const { itemId, bayId, boardId } = req.body;
    
    // Target board and group mapping
    let targetBoardId = '5085312780'; // Default to Jobs board
    let targetGroupId = '';

    switch (bayId) {
      case 'gate': targetGroupId = 'group_mm03r7dx'; break; // Awaiting Inspection Pit
      case 'inspection-1': targetGroupId = 'group_mm03n6ax'; break; // In Inspection Pit
      case 'workshop-1':
      case 'workshop-2':
      case 'workshop-3': targetGroupId = 'new_group'; break; // In Workshop
      case 'oil-pit-1': targetGroupId = 'group_mm03fwnz'; break; // Service Pit
      case 'trailer-1':
      case 'washbay': targetGroupId = 'group_mm07w1db'; break; // Worked on in Yard
      case 'tyre-1': 
        targetBoardId = '1565754578'; // Tyre Bay board
        targetGroupId = 'new_group41841__1'; // In Tyre Bay
        break;
      default: 
        return res.status(400).json({ error: "Cannot move to this bay or bay not mapped to a group" });
    }

    let query = '';
    
    // If moving to a different board
    if (boardId && boardId !== targetBoardId) {
      query = `mutation { move_item_to_board (item_id: ${itemId}, board_id: ${targetBoardId}, group_id: "${targetGroupId}") { id } }`;
    } else {
      // Moving within the same board
      // Map bayId to Location column index for color_mm03xmg3
      let locationIndex = -1;
      switch (bayId) {
        case 'gate': locationIndex = 1; break; // Waiting Area
        case 'inspection-1': locationIndex = 7; break; // In Inspection Pit
        case 'workshop-1':
        case 'workshop-2':
        case 'workshop-3': locationIndex = 0; break; // Workshop
        case 'oil-pit-1': locationIndex = 2; break; // Service Pit
        case 'trailer-1': locationIndex = 4; break; // Electrical/Other
        case 'washbay': break; // Don't update location for washbay
      }

      if (locationIndex !== -1) {
        const columnValues = JSON.stringify(JSON.stringify({ color_mm03xmg3: { index: locationIndex } }));
        query = `mutation { 
          move_item_to_group (item_id: ${itemId}, group_id: "${targetGroupId}") { id }
          change_multiple_column_values (item_id: ${itemId}, board_id: ${targetBoardId}, column_values: ${columnValues}) { id }
        }`;
      } else {
        query = `mutation { move_item_to_group (item_id: ${itemId}, group_id: "${targetGroupId}") { id } }`;
      }
    }

    const data = JSON.stringify({ query });

    const apiKey = process.env.MONDAY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MONDAY_API_KEY environment variable is not set" });
    }

    const options = {
      hostname: 'api.monday.com',
      path: '/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2024-01'
      }
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => {
        try {
          res.json(JSON.parse(body));
        } catch (e) {
          console.error("Failed to parse monday.com response:", body);
          res.status(500).json({ error: "Failed to parse monday.com response" });
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy();
      res.status(504).json({ error: "Monday.com API request timed out" });
    });

    request.on('error', (e) => {
      console.error("Monday.com API Error:", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: `Monday.com API Error: ${e.message}` });
      }
    });
    
    request.write(data);
    request.end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
