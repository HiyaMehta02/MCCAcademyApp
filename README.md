# MCCC Academy App 🏏

**🔗 Links:**
* [GitHub Repository](https://github.com/HiyaMehta02/MCCAcademyApp)
* [Figma Design & Prototypes](https://www.figma.com/design/1qdwx5CAK5xDp4qd2zrbPt/MCCC-APP?node-id=0-1&p=f&t=owy36VCPtUUc53Am-0)
* [Supabase Database Dashboard](https://supabase.com/dashboard/project/fdnyfyvgohexlszuxwdv/editor/17412?schema=public)

The MCCC Academy App is a dedicated mobile application designed for the Muscat Cricket Coaching Centre (MCCC). Built with a strong emphasis on intuitive UI/UX and user-centered design, the app serves as a centralized platform to connect coaches and players, streamlining scheduling, communication, and player development.

## 🚀 Tech Stack

* **Frontend (Client):** Mobile application built with JavaScript/TypeScript, focusing on interactive and seamless navigation.
* **Backend (Server):** Node.js-based backend environment for API and data handling.
* **Database & Auth:** [Supabase](https://supabase.com/) for scalable database management.

## 🎨 UI/UX & Design Process

The initial phases of this project heavily involved wireframing and prototyping using Figma to ensure the best possible experience for both coaches and players before active development began.

## 📁 Repository Structure

The project is organized into two main directories:

* **`/client`**: Contains the mobile application source code, UI components, and client-side logic.
* **`/server`**: Contains the backend API, server-side business logic, and database configuration.

## ⚙️ Environment Variables

To run this project locally, you will need to create `.env` files in both the client and server directories.

### Client Environment Variables (`client/.env`)

Create `/client/.env` (see `client/.env.example`). The face API URL must be reachable from the **phone on Wi‑Fi**:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_WIFI_IPV4:8000
```

Or:

```env
EXPO_PUBLIC_IP_ADDRESS=YOUR_PC_WIFI_IPV4
```

Use **`ipconfig`** (Windows) and the **Wi‑Fi** adapter’s **IPv4** — not `127.0.0.1`, and usually not VirtualBox (`192.168.56.x`) or WSL/Hyper-V-only addresses. After changing values, run `npx expo start -c` so the bundle picks up `EXPO_PUBLIC_*`.

Run **`scripts/check-face-api-network.ps1`** for a local checklist. Start the API with **`--host 0.0.0.0`** (see below) and allow **inbound TCP 8000** in Windows Firewall if the phone still cannot connect.

### Server Environment Variables (`server/.env`)

Create a `.env` file in the root of the `/server` folder. Add your necessary backend variables here:

```env
SUPABASE_URL="api_url"
SUPABASE_KEY="api_key"
```

## 🛠️ Getting Started

### Prerequisites

Make sure you have the following installed on your local machine:

* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/HiyaMehta02/MCCAcademyApp.git](https://github.com/HiyaMehta02/MCCAcademyApp.git)
   cd MCCAcademyApp
   ```

2. **Install Client Dependencies:**
   ```bash
   cd client
   npm install
   ```

3. **Install Server Dependencies:**
   ```bash
   cd ../server
   npm install
   ```

### Running the Application Locally

**Starting the Client:**
To run the mobile application in your development environment:

```bash
cd client
npm start
```

**Starting the Server:**
To run your backend database file:

```bash
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

*Note: This is an active project in ongoing development.*
