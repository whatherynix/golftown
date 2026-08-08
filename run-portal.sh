#!/usr/bin/env bash

# ==============================================================================
# Golf Town Store Credit Portal - Termux Live TryCloudflare Tunnel Runner
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

export NODE_ENV=production
export PORT=3000

# Locate cloudflared binary
CF_BIN="cloudflared"
if ! command -v cloudflared &> /dev/null; then
    if [ -f "./cloudflared" ]; then
        CF_BIN="./cloudflared"
    elif [ -f "$PREFIX/bin/cloudflared" ]; then
        CF_BIN="$PREFIX/bin/cloudflared"
    else
        echo -e "${RED}[!] cloudflared binary not found. Please run ./termux-install.sh first.${NC}"
        exit 1
    fi
fi

# Cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}[*] Gracefully terminating server and shutting down Cloudflare Tunnel...${NC}"
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ -n "$TUNNEL_PID" ]; then
        kill $TUNNEL_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}[✔] All processes stopped cleanly.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo -e "${PURPLE}==============================================================================${NC}"
echo -e "${CYAN}    Golf Town Store Credit Portal — Launching on Termux/Android${NC}"
echo -e "${PURPLE}==============================================================================${NC}"

# Check if build exists
if [ ! -f "dist/server.cjs" ]; then
    echo -e "${YELLOW}[!] Compiled bundle dist/server.cjs missing. Running 'npm run build' first...${NC}"
    npm run build
fi

# Locate node binary
NODE_BIN=$(command -v node)
if [ -z "$NODE_BIN" ]; then
    echo -e "${RED}[!] Node.js binary not found.${NC}"
    exit 1
fi

echo -e "${BLUE}[1/2] Starting Node.js backend server on http://127.0.0.1:3000...${NC}"
$NODE_BIN dist/server.cjs > server.log 2>&1 &
SERVER_PID=$!

sleep 2

# Verify server process is alive
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}[!] Server failed to start. Viewing last lines of server.log:${NC}"
    tail -n 20 server.log
    exit 1
fi

echo -e "${BLUE}[2/2] Launching TryCloudflare Quick Tunnel for secure HTTPS access...${NC}"
rm -f cloudflared.log
$CF_BIN tunnel --url http://127.0.0.1:3000 > cloudflared.log 2>&1 &
TUNNEL_PID=$!

echo -e "${YELLOW}[*] Negotiating secure tunnel connection with Cloudflare edge network...${NC}"

CF_URL=""
for i in {1..30}; do
    sleep 1
    if [ -f "cloudflared.log" ]; then
        CF_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" cloudflared.log | head -n 1)
        if [ -n "$CF_URL" ]; then
            break
        fi
    fi
done

echo ""
echo -e "${PURPLE}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 GOLF TOWN PORTAL ACTIVE & SECURELY BROADCASTING 🎉${NC}"
echo -e "${PURPLE}==============================================================================${NC}"
echo -e " 🖥️  Local Network:   ${CYAN}${BOLD}http://localhost:3000${NC}"
if [ -n "$CF_URL" ]; then
    echo -e " 🔒  TryCloudflare:   ${GREEN}${BOLD}${CF_URL}${NC}"
    echo -e " 📱  Deposit Portal:  ${GREEN}${BOLD}${CF_URL}/?session_id=LIVE-DEMO${NC}"
    export APP_URL="$CF_URL"
    echo "$CF_URL" > .cloudflare_url
else
    echo -e "${RED}[!] Failed to establish Cloudflare Tunnel. Check cloudflared.log for details.${NC}"
    echo -e "    You can still access the portal locally at http://localhost:3000"
fi
echo -e "${PURPLE}==============================================================================${NC}"
echo -e "${YELLOW}[*] Press CTRL+C to safely shut down the portal and tunnel.${NC}"

# Keep script running
wait $SERVER_PID
