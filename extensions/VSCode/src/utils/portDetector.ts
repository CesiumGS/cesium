import * as net from 'net';

/**
 * Utility for detecting available ports for dev servers
 */
export class PortDetector {
    private static readonly DEFAULT_PORT = 5173;
    private static readonly PORT_RANGE_END = 5273; // Check 100 ports
    private static readonly TIMEOUT_MS = 2000  // Increased timeout to 2 seconds

    /**
     * Check if a specific port is available
     */
    private static async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
                    resolve(false);
                } else {
                    resolve(false);
                }
            });

            server.once('listening', () => {
                server.close();
                resolve(true);
            });

            server.listen(port, '127.0.0.1');
        });
    }

    /**
     * Find the next available port starting from a given port
     */
    public static async findAvailablePort(startPort: number = this.DEFAULT_PORT): Promise<number> {
        const endPort = Math.max(startPort + 100, this.PORT_RANGE_END);
        
        for (let port = startPort; port <= endPort; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }

        // If no port found in range, throw error
        throw new Error('Could not find an available port in the specified range');
    }  

    /**
     * Check if a port is in use by attempting to connect to it
     */
    private static async isPortInUse(port: number, host: string = 'localhost'): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, this.TIMEOUT_MS);

            socket.once('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(true);
            });

            socket.once('error', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(false);
            });

            socket.connect(port, host);
        });
    }

    /**
     * Wait for a port to become available (server to start)
     */
    public static async waitForPort(
        port: number, 
        maxWaitMs: number = 30000, 
        intervalMs: number = 500
    ): Promise<boolean> {
        const startTime = Date.now();
        let attempts = 0;
        
        while (Date.now() - startTime < maxWaitMs) {
            attempts++;
            const inUse = await this.isPortInUse(port);
            
            if (inUse) {
                console.log(`Port ${port} is now in use after ${attempts} attempts (${Date.now() - startTime}ms)`);
                return true;
            }
            
            // Log every 5 attempts
            if (attempts % 5 === 0) {
                console.log(`Still waiting for port ${port}... (attempt ${attempts}, ${Date.now() - startTime}ms elapsed)`);
            }
            
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        
        console.log(`Port ${port} did not become available after ${attempts} attempts and ${maxWaitMs}ms`);
        return false;
    }
}
