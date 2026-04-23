
import json
import time
import base64

# Packet Flags
FLAG_SYN = "SYN"
FLAG_ACK = "ACK"
FLAG_FIN = "FIN"
FLAG_DATA = "DATA"

class TCPPacket:
    def __init__(self, seq_num, ack_num=0, flags=None, payload=None, session_id=None):
        self.seq_num = seq_num
        self.ack_num = ack_num
        self.flags = flags if flags else []
        self.payload = payload if payload else ""
        self.timestamp = time.time()
        self.session_id = session_id # Unique ID for this transfer session
    
    def to_json(self):
        return json.dumps({
            "seq": self.seq_num,
            "ack": self.ack_num,
            "flags": self.flags,
            "payload": self.payload,
            "ts": self.timestamp,
            "sid": self.session_id # Include session ID in packet
        })
    
    @staticmethod
    def from_json(json_str):
        try:
            data = json.loads(json_str)
            p = TCPPacket(
                seq_num=data.get("seq"),
                ack_num=data.get("ack"),
                flags=data.get("flags"),
                payload=data.get("payload"),
                session_id=data.get("sid")
            )
            p.timestamp = data.get("ts", time.time())
            return p
        except Exception as e:
            print(f"Packet Decode Error: {e}")
            return None

    def __repr__(self):
        return f"[Packet SEQ={self.seq_num} ACK={self.ack_num} FLAGS={self.flags} SZ={len(self.payload)}]"
