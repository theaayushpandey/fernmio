# Frenmio Architecture & Repository Details

This document provides a comprehensive overview of the `frenmio` repository, detailing how everything works, how all components are connected, and dividing the system into its primary roles.

## 1. Overview
**Frenmio** is a real-time collaborative video conferencing application. It allows users to join or create rooms where they can share video/audio, perform screen sharing, chat in real-time online, and collaborate on a shared whiteboard. 

The application utilizes **WebRTC** for peer-to-peer (P2P) audiovisual communication and data channels, and relies on **Socket.io** over Node.js for WebRTC signaling and real-time room presence management.

## 2. Roles in the System

The application operates fundamentally on a **Two-Role Architecture**: The Client (Frontend) and the Signaling Server (Backend).

### Role A: The Client (Frontend)
Located in the `/src` directory, this is a React application built with TypeScript, styled with Tailwind CSS and Fluent UI, and bootstrapped via Craco.

**Responsibilities:**
- **User Interface & Experience:** Provides the landing pages and the primary room interface (`Frontend/src/app/`). Handles various layouts such as the command bar, side panel (for chat), and media grids.
- **Local State Management:** Uses Zustand (located in `Frontend/src/state/`) to manage the application state globally. It maintains states for local media (`local.ts`), remote peers (`remote.ts`), chat messages (`chat.ts`), and landing configurations (`landing.ts`).
- **WebRTC Peer Management:** Handles the physical WebRTC connections using the `simple-peer` library. It maintains peer objects for every other user in the room, capturing user media (webcam/microphone) and sharing it across peer connections.
- **Interactive Tools:** Integrates `@excalidraw/excalidraw` to allow shared whiteboarding.
- **Signaling Client:** Connects to the backend via `socket.io-client` to notify its presence, discover other peers, and exchange WebRTC connection data (SDP offers/answers and ICE candidates).

### Role B: The Signaling Server (Backend)
Located in the `/server` directory, this is a lightweight Node.js/Express server that relies primarily on `Socket.io`.

**Responsibilities:**
- **Signaling relay:** WebRTC requires peers to exchange network information before connecting directly. The server acts as a middleman for this handshake, allowing users to send initial "messages" bridging the gap.
- **Room Management:** Uses `node-cache` to persist room metadata temporarily (e.g., room capacities and current connected `userIds`).
- **Event Coordination:** Handles incoming socket events such:
    - `request:create_room`: Bootstraps a fresh room ID and associates the creator.
    - `request:join_room`: Performs capacity checks and notifies existing users (`action:establish_peer_connection`) to prepare for a new peer.
    - `request:leave_room`: Cleans up node-cache arrays and notifies remaining peers (`action:terminate_peer_connection`).
    - `request:send_mesage`: Relays direct chat or signaling payloads between explicit users.
- **Session Tracking:** Tracks authenticated or anonymous Socket.io connections (`sessionId`) and their associated rooms to detect disconnections.

---

## 3. How Everything Works and Is Connected

The core functionality of Frenmio relies heavily on the interaction between the React Client, the Node.js Server, and the browser's native WebRTC APIs. Here is the step-by-step flow of how it is fully connected:

### Phase 1: Initialization & Creating/Joining a Room
1. **User visits the site:** The frontend (React) mounts and users operate within `Frontend/src/landing`.
2. **Socket Handshake:** The frontend initiates a WebSocket connection to the Node.js server. The connection includes a unique `sessionId`.
3. **Room creation/join request:** 
    - If establishing a new room, the client emits `request:create_room`. The Node.js server uses `nanoid` to create a room ID, saves it in `node-cache`, and responds via `action:room_connection_established`.
    - If joining an existing room, the client parses the room link and emits `request:join_room`. The backend verifies the room exists and isn't full.

### Phase 2: WebRTC Signaling & Peer Connections
Once a user joins a room, they need to connect directly to all other existing participants.
1. The **Backend** broadcasts `action:establish_peer_connection` to all existing users in the room, informing them of the newly joined user.
2. The **Existing Clients** receive this and use `simple-peer` to create WebRTC **Initiator** instances. Each creates an SDP (Session Description Protocol) offer.
3. The **Existing Clients** send these SDP offers to the **New Client** through the backend server via `request:send_mesage` (Signaling).
4. The **New Client** receives the offers, generates SDP answers, and sends them back through the backend to the original users.
5. ICE candidates (network routing info) are similarly exchanged over the server.
6. Once bridging is negotiated, a **Direct Peer-to-Peer Connection** is established. Audio, Video, and Chat data now flow directly between browsers bypassing the Node.js server.

### Phase 3: In-Room Experience (Client Side Execution)
Once connected, the backend mostly waits. The dense interactions occur entirely on the client:
- **Media Streams:** `Frontend/src/app/media` captures the laptop webcam/microphone strings using `getUserMedia()` and pipes them into the `simple-peer` instances. The incoming remote streams trigger state updates in `Frontend/src/state/remote.ts` and are injected into HTML `<video>` tags.
- **Chat:** Chat messages either use socket relay or WebRTC data channels and are synced via `Frontend/src/state/chat.ts`.
- **Whiteboard:** Built over Excalidraw, drawing paths are tracked and broadcasted to connected peers using P2P data channels, immediately rendering the corresponding strokes on all participants' whiteboards.

### Phase 4: Termination
When a user disconnects or navigates away, the socket connection drops or emits `request:leave_room`. 
The server detects this, broadcasts `action:terminate_peer_connection` to the room, and the remaining clients instantly destroy that user's WebRTC peer, removing their video feed from the UI grid. If the room becomes empty, it is deleted from the `node-cache` memory.

---

## 4. Usage Environments (Local vs. Online)

### Local Configuration (Default)
By default out-of-the-box, **Frenmio is configured for local (offline) and Local Area Network (LAN) usage**. 
When running locally (e.g., `localhost:3000` & `localhost:5005`), peer WebRTC connections negotiate easily because ICE candidates consist solely of internal/local IP addresses that are mutually reachable. 

### Online Configuration (Hosting on the Internet)
When the application is hosted on the public internet, WebRTC requires additional infrastructure to traverse NATs (Network Address Translators) and strict firewalls. If you deploy Frenmio online, **video and audio stream connections will likely fail unless properly configured**.

To make it work correctly online, the application requires **STUN** and **TURN** servers:
1. **STUN Servers**: Used to discover the public IP addresses of each peer.
2. **TURN Servers**: Used as a fallback to relay media data when direct peer-to-peer connection is blocked by firewalls or symmetric NATs.

#### Required Code Changes for Online Usage
To enable this, you must explicitly provide an `iceServers` configuration array to the WebRTC instances. In the codebase (typically where `simple-peer` is instantiated, e.g., inside `Frontend/src/state/remote.ts` or similar connection wrappers), you need to inject STUN/TURN credentials.

Example modification:
```typescript
const peer = new Peer({
  initiator: isInitiator,
  stream: localMediaStream,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, // Free Public STUN Server
      {
        urls: 'turn:your-turn-server.com:3478', // Hosted or Paid TURN Server
        username: 'your-username',
        credential: 'your-password'
      }
    ]
  }
});
```

Without providing proper `iceServers` (specifically TURN servers for complete coverage), video feeds and connections will often fail to establish between peers situated on different networks across the internet.

---

## 5. Backend Deep Dive: How the Server Works

It is crucial to understand that the Frenmio server is **Event-Driven via WebSockets**, and does **not** rely on standard HTTP GET/POST API endpoints.

### HTTP vs WebSockets in Frenmio
In a typical REST API backend, you would expect endpoints like `app.get('/rooms')` or `app.post('/join')`. However, WebRTC signaling and real-time chat require low latency, bidirectional communication that standard HTTP requests cannot efficiently provide.

If you look at the server code (`Backend/server.ts`, with the socket events in `Backend/src/controllers/room.controller.ts`), there is exactly **one HTTP route**:
```typescript
const httpServer = createServer((_, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('ok\n');
})
```
This route purely acts as a health check and a vehicle to bind the `Socket.io` instance to an active port. Every other operation happens via persistent WebSocket connections.

### Core Server Components

#### 1. Connection & Handshake (`io.use`)
When a client connects, they must provide a `sessionId` in the socket payload. The server intercepts this:
- Assigns the `sessionId` to the server-side socket data.
- Forces the socket to join a "personal room" identical to their `sessionId`. This allows the server to send private/direct messages to specific users efficiently.
- Reconnects the user to an active conference room if they were previously disconnected (`currentRoomId`).

#### 2. In-Memory Room Storage (`node-cache`)
Instead of a persistent database like MongoDB or PostgreSQL, the server uses `node-cache` configured with a 12-hour Time-To-Live (TTL). 
- It stores a `Rooms` class object containing room metadata and an array of participant `userIds`.
- When users leave, their IDs are removed from the array. If the array hits 0 length, the room is completely cleared from cache to prevent memory leaks.

#### 3. Event Listeners (The Real "API")
Instead of HTTP POST/GET requests, the server acts upon specific socket events emitted by clients:
- `request:create_room`: Generates a random `nanoid`, initializes a room cache, and emits back an `action:room_connection_established` success payload.
- `request:join_room`: Performs capacity validations, verifies if the target room exists, and broadcasts `action:establish_peer_connection` to let existing peers know a new user just arrived and needs WebRTC offers.
- `request:leave_room`: Invokes an internal `kickOut()` function that formally terminates peer connections and broadcasts the departure to remaining room users.
- `request:send_mesage`: Acts as the Signaling Relay. When User A wants to send an SDP offer, ICE candidate, or direct chat to User B, they wrap it in this event payload. The server simply finds User B's socket and forwards the data via `action:message_received`.

This lightweight relay mechanism ensures the backend remains extremely memory efficient, acting purely as a matchmaker and signaling router so browsers can handle the heavy lifting (video processing, audio streaming, and whiteboard drawing) directly.

---

## 6. Frontend Interactivity & State Management

The frontend architecture heavily avoids constantly hitting the backend. Once the WebRTC connections are bridged, interactions happen peer-to-peer (P2P), managed efficiently via Zustand.

### 6.1 State Management (Zustand)
Frenmio uses **Zustand** (found in `Frontend/src/state/`) instead of React Context or Redux to maintain a predictable, globally accessible state without severe prop drilling or re-rendering penalties. It is split logically:
- **`local.ts`**: Manages the personal user state. This includes checking active devices, caching preferences into browser `localStorage` using Zustand's `persist` middleware, toggling mic/camera logic (`navigator.mediaDevices.getUserMedia`), and handling UI toggles like side panels.
- **`remote.ts`**: Handles the array of active WebRTC `connections`. Each connection maps a `userId` to a `simple-peer` instance and their incoming media streams.
- **`chat.ts`**: Maintains the history of text messages.

### 6.2 Collaborative Whiteboard Integration 
Frenmio integrates the official `@excalidraw/excalidraw` React component (`Frontend/src/comps/whiteboard.tsx`) to power instantaneous collaborative sketching.

**How the Whiteboard API Works (Serverless Data):**
There are **no standard backend HTTP API calls** made to save or fetch whiteboard strokes. Instead, the strokes are transferred directly over WebRTC Data Channels.

1. **Drawing on Canvas:** When an active user draws a line, Excalidraw triggers its `onChange(elements, appState)` callback.
2. **Serialization:** The frontend takes these new vector points and serializes them into a JSON string using Excalidraw's `serializeAsJSON`.
3. **P2P Broadcasting:** The custom hook iterates through every active peer connection inside Zustand's `connections` list and explicitly calls WebRTC's native data channel API:
   ```typescript
   // Simplified logic
   connections.forEach(conn => {
     conn.peerInstance.send(JSON.stringify({ whiteboard: serialized_data }));
   });
   ```
4. **Receiving Strokes:** Other clients' browsers have an active `on('data')` listener watching their respective peer connection. When they receive this string payload, they perform a `JSON.parse()`. If it contains `whiteboard` data, they seamlessly inject it right into their local Excalidraw canvas via `excalidrawAPI.updateScene({ elements })`.

This effectively allows multiple people to draw simultaneously over the internet with zero backend database lag. The text chat module (`chat.ts`) uses this exact same P2P data-channel architecture to transmit live text messages.
