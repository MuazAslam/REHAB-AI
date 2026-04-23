
import asyncio
import ssl
import json
import sys
import os

# Add backend to path to import protocol
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from tcp_control_flow.protocol import TCPPacket, FLAG_SYN

async def verify_tls():
    uri = '127.0.0.1'
    port = 65432
    
    print(f"Attempting TLS connection to {uri}:{port}...")

    # SSL Context
    ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        reader, writer = await asyncio.open_connection(uri, port, ssl=ssl_context)
        
        # Get the SSL Object from the transport
        ssl_object = writer.get_extra_info('ssl_object')
        cipher = ssl_object.cipher()
        version = ssl_object.version()
        peer_cert = ssl_object.getpeercert() # Might be None if self-signed and not validated
        
        print("\n" + "="*40)
        print("🔐 SECURE TLS CONNECTION ESTABLISHED")
        print("="*40)
        print(f"✅ Protocol Version : {version}")
        print(f"✅ Cipher Suite     : {cipher[0]}")
        print(f"✅ Encryption Bits  : {cipher[2]} bits")
        print(f"✅ Server Address   : {uri}:{port}")
        print("="*40 + "\n")
        
        # Try sending a SYN packet just to be sure we can write encrypted data
        syn_pkt = TCPPacket(seq_num=0, flags=[FLAG_SYN])
        writer.write(syn_pkt.to_json().encode())
        await writer.drain()
        print(">> Encrypted Data Sent (SYN Packet)")
        
        writer.close()
        await writer.wait_closed()
        print(">> Connection Closed Gracefully")

    except ConnectionRefusedError:
        print("❌ Connection Refused. Is the server running?")
    except ssl.SSLError as e:
        print(f"❌ SSL Error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_tls())
