from .protocol import TCPPacket, FLAG_SYN, FLAG_ACK, FLAG_FIN, FLAG_DATA
import json

class ReliableReceiver:
    def __init__(self, send_ack_callback):
        self.send_ack = send_ack_callback # Function to send ACK back
        self.buffer = {} # seq_num -> payload
        self.expected_seq = 0
        self.is_finished = False
        self.faults_simulated = set() # Track dropped seqs to allow retransmission
        
    async def process_packet(self, json_packet):
        pkt = TCPPacket.from_json(json_packet)
        if not pkt:
            return
        
        if FLAG_SYN in pkt.flags:
            self.expected_seq = 0
            self.buffer = {}
            await self.send_ack(pkt.seq_num)
            return
            
        if FLAG_FIN in pkt.flags:
            print("[Receiver] FIN Received. Transfer Ending.")
            self.is_finished = True
            await self.send_ack(pkt.seq_num)
            return

        if FLAG_DATA in pkt.flags:
            # --- FAULT INJECTION (Deterministic) ---

            #    Drop packet 25 
            # is_burst_loss = (pkt.seq_num == 25) or (pkt.seq_num == 36) or (pkt.seq_num == 65)
            # if is_burst_loss and pkt.seq_num not in self.faults_simulated:
            #      print(f"[Receiver] SIMULATING TIMEOUT: Dropping SEQ={pkt.seq_num} (Silence)")
            #      self.faults_simulated.add(pkt.seq_num)
            #      return
            # ---------------------------------------

            print(f"[Receiver] [Session={pkt.session_id}] Received SEQ={pkt.seq_num}")
            await self.send_ack(pkt.seq_num)
            print(f"[Receiver] Sent ACK={pkt.seq_num}")
            
            if pkt.seq_num not in self.buffer:
                self.buffer[pkt.seq_num] = pkt.payload
                
    def get_reassembled_data(self):
        if not self.buffer:
            return b""
            
        sorted_keys = sorted(self.buffer.keys())
        full_data = ""
        for k in sorted_keys:
            full_data += self.buffer[k]
            
        return full_data.encode('latin-1')
