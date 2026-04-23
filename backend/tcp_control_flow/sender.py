
import asyncio
import json
import time
from .protocol import TCPPacket, FLAG_SYN, FLAG_ACK, FLAG_FIN, FLAG_DATA

# Constants
MSS = 1024 * 4 # Max Segment Size (4KB chunk)
INIT_CWND = 1
SSTHRESH_INIT = 32
RTO_INIT = 1.0 # Initial Retransmission Timeout
ALPHA = 0.125
BETA = 0.25

class ReliableSender:
    def __init__(self, socket_client, data_bytes, session_id=None):
        self.socket = socket_client # Logic wrapper or actual socket interface
        self.data = data_bytes
        self.total_len = len(data_bytes)
        self.session_id = session_id # Unique session ID to tag packets
        
        # TCP State
        self.base = 0 # Base of the window
        self.next_seq_num = 0
        self.cwnd = INIT_CWND
        self.ssthresh = SSTHRESH_INIT
        self.dup_acks_count = 0
        self.state = "SLOW_START" # SLOW_START, CONGESTION_AVOIDANCE, FAST_RECOVERY
        
        # Buffers
        self.unacked_packets = {} # seq -> {packet, sent_time, retransmits}
        self.finished = False

        # --- DYNAMIC RTO VARIABLES (Jacobson's Algorithm) ---
        self.estimated_rtt = 0.1 # Start with a guess (100ms)
        self.dev_rtt = 0.05
        self.timeout_interval = self.estimated_rtt + 4 * self.dev_rtt

        # --- STATS LOGGING ---
        self.stats_log = [] # List of tuples: (timestamp, cwnd, ssthresh, state, type)
        self.packets_sent_count = 0
        self.packets_lost_count = 0 # Retransmitted count
        self.bytes_sent = 0
        self.start_time = time.time()
        
    async def handshake(self):
        """Perform 3-way handshake (Simulated: SYN -> SYN-ACK -> ACK)"""
        print("[Sender] Initiating Handshake...")
        # 1. Send SYN
        syn_pkt = TCPPacket(seq_num=self.next_seq_num, flags=[FLAG_SYN], session_id=self.session_id)
        await self.socket.send(syn_pkt.to_json())
        self.next_seq_num += 1
        
        # 2. Wait for SYN-ACK (handled by external receive loop or assumed for simplicity if direct interface)
        # For this logic, we assume the caller handles the read and calls `process_ack`
        return True

    def get_segments(self):
        """Generator to yield data chunks"""
        for i in range(0, self.total_len, MSS):
            yield self.data[i: i + MSS]

    async def send_data(self):
        """Main sending loop using TCP Reno Logic"""
        print(f"[Sender] Starting Data Transfer. Total Bytes: {self.total_len}")
        self.start_time = time.time()
        
        chunks = [self.data[i: i + MSS] for i in range(0, self.total_len, MSS)]
        total_segments = len(chunks)
        
        print(f"[Sender] Total Segments: {total_segments}")
        
        segment_idx = 0
        self.next_seq_num = 0 # Reset for data transfer (since handshake used 0)
        
        while self.base < total_segments:
            # 1. Send Loop (limited by CWND)
            # Window Range: [base, base + cwnd]
            while self.next_seq_num < self.base + int(self.cwnd) and self.next_seq_num < total_segments:
                # Construct Packet
                payload = chunks[self.next_seq_num] # Using Index as Seq Num for simplicity in this sim
                pkt = TCPPacket(seq_num=self.next_seq_num, flags=[FLAG_DATA], payload=payload.decode('latin-1'), session_id=self.session_id) # Store binary as string for JSON
                
                # Send
                print(f"[Sender] Sending SEQ={self.next_seq_num}...") 
                await self.socket.send(pkt.to_json())
                
                # Stats
                self.packets_sent_count += 1
                self.bytes_sent += len(payload)
                
                # Buffer
                self.unacked_packets[self.next_seq_num] = {
                    "pkt": pkt,
                    "sent_time": time.time()
                }
                
                print(f"[Sender] Sent SEQ={self.next_seq_num} (CWND={self.cwnd})")
                self.next_seq_num += 1
            
            # 2. Check Timeouts & Retransmit
            current_time = time.time()
            for seq, info in list(self.unacked_packets.items()):
                if current_time - info['sent_time'] > self.timeout_interval:
                    print(f"[Sender] Timeout on SEQ={seq} (RTO={self.timeout_interval:.3f}s). Retransmitting...")
                    await self.socket.send(info['pkt'].to_json())
                    info['sent_time'] = current_time # Reset timer
                    
                    # Karn's Algorithm: Don't update RTT samples for retransmitted packets
                    info['retransmits'] = info.get('retransmits', 0) + 1
                    
                    # Double RTO on timeout (Exponential Backoff)
                    self.timeout_interval *= 2
                    
                    self.packets_lost_count += 1
                    
                    # Reno Action: Timeout -> ssthresh = cwnd/2, cwnd = 1, Slow Start
                    self.ssthresh = max(self.cwnd // 2, 1)
                    self.cwnd = 1
                    self.state = "SLOW_START"
                    
                    # Log Stat
                    self.stats_log.append({
                        "timestamp": time.time() - self.start_time,
                        "cwnd": self.cwnd,
                        "ssthresh": self.ssthresh,
                        "state": self.state,
                        "event": "TIMEOUT"
                    })
            
            # Yield control to allow ACKs to be processed (in real asyncio env)
            await asyncio.sleep(0.01) # Reduced sleep for better throughput

        # Teardown
        fin_pkt = TCPPacket(seq_num=self.next_seq_num, flags=[FLAG_FIN], session_id=self.session_id)
        await self.socket.send(fin_pkt.to_json())
        self.finished = True
        print("[Sender] Transfer Complete.")

    def process_ack(self, ack_num):
        """Process Incoming ACK"""
        # Selective Repeat Logic with Cumulative ACK base update
        
        if ack_num in self.unacked_packets:
            packet_data = self.unacked_packets[ack_num]
            del self.unacked_packets[ack_num]

            # --- RTT CALCULATION ---
            # Only update if never retransmitted (Karn's Algorithm partial implementation)
            if packet_data.get('retransmits', 0) == 0:
                sample_rtt = time.time() - packet_data['sent_time']
                
                # EstimatedRTT = (1 - alpha) * EstimatedRTT + alpha * SampleRTT
                self.estimated_rtt = (1 - ALPHA) * self.estimated_rtt + ALPHA * sample_rtt
                
                # DevRTT = (1 - beta) * DevRTT + beta * |SampleRTT - EstimatedRTT|
                self.dev_rtt = (1 - BETA) * self.dev_rtt + BETA * abs(sample_rtt - self.estimated_rtt)
                
                # Timeout = EstimatedRTT + 4 * DevRTT
                self.timeout_interval = self.estimated_rtt + 4 * self.dev_rtt
            
            # TCP Reno Logic
            if self.state == "SLOW_START":
                self.cwnd += 1
                if self.cwnd >= self.ssthresh:
                    self.state = "CONGESTION_AVOIDANCE"
            elif self.state == "CONGESTION_AVOIDANCE":
                self.cwnd += 1 / self.cwnd # Add 1 per RTT (approx)
            
            print(f"[Sender] Received ACK={ack_num}. New CWND={self.cwnd:.2f}")
            
            # Log Stat (Sampled occasionally to avoid massive logs if needed, but for now capture all changes)
            self.stats_log.append({
                "timestamp": time.time() - self.start_time,
                "cwnd": self.cwnd,
                "ssthresh": self.ssthresh,
                "state": self.state,
                "state": self.state,
                "event": "ACK",
                "rtt": self.estimated_rtt,
                "rto": self.timeout_interval
            })
            
            # Move base if possible
            while self.base not in self.unacked_packets and self.base < self.next_seq_num:
                self.base += 1
        
        else:
            # Duplicate ACK
            self.dup_acks_count += 1
            if self.dup_acks_count == 3:
                # Fast Retransmit / Fast Recovery would go here
                print("[Sender] 3 Dup ACKs. Fast Retransmit Triggered (Simulated).")
                self.ssthresh = max(self.cwnd // 2, 1)
                self.cwnd = self.ssthresh + 3
                self.state = "FAST_RECOVERY"
                
                self.stats_log.append({
                    "timestamp": time.time() - self.start_time,
                    "cwnd": self.cwnd,
                    "ssthresh": self.ssthresh,
                    "state": self.state,
                    "event": "TRIPLE_DUP_ACK"
                })

    def get_transfer_stats(self):
        """Return captured statistics"""
        duration = time.time() - self.start_time
        throughput_bps = (self.bytes_sent * 8) / duration if duration > 0 else 0
        
        # Save to File instead of printing to screen
        stats = {
            "duration": duration,
            "total_bytes": self.bytes_sent,
            "packets_sent": self.packets_sent_count,
            "packets_lost": self.packets_lost_count,
            "cwnd_log": self.stats_log,
            "throughput_bps": throughput_bps
        }
        
        return stats
