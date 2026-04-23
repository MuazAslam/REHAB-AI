import struct
import json
import asyncio

class SocketWrapper:
    """
    Wraps standard asyncio StreamReaders/Writers to send/receive 
    JSON messages with a 4-byte length prefix.
    """
    def __init__(self, reader, writer):
        self.reader = reader
        self.writer = writer

    async def send(self, data_str):
        """
        Send a string (JSON) with a length header.
        """
        encoded_data = data_str.encode('utf-8')
        length = len(encoded_data)
        
        # Pack 4-byte integer (Big Endian) for length
        header = struct.pack('!I', length)
        
        self.writer.write(header + encoded_data)
        await self.writer.drain()

    async def recv(self):
        """
        Receive a length-prefixed message.
        Returns the decoded string (or None if connection closed).
        """
        # Read 4-byte Header
        try:
            header = await self.reader.readexactly(4)
        except asyncio.IncompleteReadError:
            return None # Connection closed
            
        length = struct.unpack('!I', header)[0]
        
        # Read Payload
        try:
            payload = await self.reader.readexactly(length)
        except asyncio.IncompleteReadError:
            return None
            
        return payload.decode('utf-8')

    async def close(self):
        try:
            self.writer.close()
            await self.writer.wait_closed()
        except (OSError, asyncio.CancelledError, Exception) as e:
            # Suppress errors during shutdown (common with SSL/Asyncio on Windows)
            # e.g. [SSL: APPLICATION_DATA_AFTER_CLOSE_NOTIFY]
            pass
