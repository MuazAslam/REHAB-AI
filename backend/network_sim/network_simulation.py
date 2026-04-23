import random
import matplotlib.pyplot as plt
import os
import numpy as np

# Configuration
OUTPUT_DIR = "backend/network_sim/generated_plots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

class TCPRenoSimulator:
    def __init__(self, ssthresh=32, max_rtts=100):
        self.cwnd = 1
        self.ssthresh = ssthresh
        self.rtt_history = []
        self.cwnd_history = []
        self.ssthresh_history = []
        self.max_rtts = max_rtts
        self.packet_loss_prob = 0.05  # 5% probability of packet loss event per RTT
        self.dup_acks = 0
        self.state = "Slow Start"
        
        # Stats
        self.packets_sent = 0
        self.packets_lost = 0
        self.packets_retransmitted = 0

    def run(self):
        print(f"Starting TCP Reno Simulation for {self.max_rtts} RTTs...")
        
        for rtt in range(self.max_rtts):
            self.rtt_history.append(rtt)
            self.cwnd_history.append(self.cwnd)
            self.ssthresh_history.append(self.ssthresh)
            
            # Simulate Packet Transmission
            packets_in_flight = int(self.cwnd)
            self.packets_sent += packets_in_flight
            
            # Check for Loss Event
            loss_occurred = random.random() < self.packet_loss_prob
            
            if loss_occurred:
                self.packets_lost += 1 # Simplified: 1 loss event implies "some" packets lost
                self.packets_retransmitted += 1 # Simplified retransmission logic
                self.handle_loss_event()
            else:
                self.handle_ack()
                
            # Basic Compression Simulation (Separate from Flow Control)
            self.simulate_compression()

        self.plot_results()
        self.print_stats()

    def handle_ack(self):
        """Processes successful ACKs."""
        if self.cwnd < self.ssthresh:
            # Slow Start: CWND doubles every RTT (exponential growth) -> +1 per ACK -> effectively +CWND per RTT
            # For simulation step (per RTT), we double it.
            self.cwnd *= 2
            self.state = "Slow Start"
        else:
            # Congestion Avoidance: CWND + 1 per RTT (linear growth)
            self.cwnd += 1
            self.state = "Congestion Avoidance"
        self.dup_acks = 0

    def handle_loss_event(self):
        """Handles packet loss (simulates 3-duplicate ACKs or Timeout)."""
        # Simplified Reno behavior:
        # On loss, Multiplicative Decrease
        self.ssthresh = max(self.cwnd / 2, 2)
        self.cwnd = self.ssthresh # Fast Recovery entry point roughly
        self.state = "Fast Recovery / Loss"
        print(f"Loss Event at RTT {len(self.rtt_history)}! CWND reduced to {self.cwnd}, ssthresh to {self.ssthresh}")

    def simulate_compression(self):
        """Simulates compression of a random payload."""
        # Generating random text data
        original_size = random.randint(500, 1500) # bytes
        # Text compression usually achieves ~50% ratio, random binary ~0%
        # Simulate text-like data
        compression_ratio = random.uniform(0.4, 0.7) 
        compressed_size = int(original_size * compression_ratio)
        # Verify edge case: compressed > original (possible with small high-entropy data)
        
        # (This is just for stats tracking, not influencing CWND in this simple model)
        pass 

    def plot_results(self):
        # 1. Congestion Window vs Time (Sawtooth)
        plt.figure(figsize=(10, 6))
        plt.plot(self.rtt_history, self.cwnd_history, label='CWND', color='blue', linewidth=2)
        plt.plot(self.rtt_history, self.ssthresh_history, label='ssthresh', color='red', linestyle='--', linewidth=2)
        plt.title("TCP Reno Congestion Control: CWND vs Time")
        plt.xlabel("Round Trip Time (RTT)")
        plt.ylabel("Window Size (Packets)")
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.savefig(os.path.join(OUTPUT_DIR, "tcp_reno_cwnd.png"))
        plt.close()
        
        # 2. Packet Loss Statistics
        plt.figure(figsize=(8, 6))
        labels = ['Total Sent', 'Retransmitted', 'Lost (Events)']
        values = [self.packets_sent, self.packets_retransmitted, self.packets_lost]
        colors = ['green', 'orange', 'red']
        
        plt.bar(labels, values, color=colors)
        plt.title("Packet Transmission Statistics")
        plt.ylabel("Count")
        
        # Add value labels
        for i, v in enumerate(values):
            plt.text(i, v + (max(values)*0.01), str(v), ha='center', fontweight='bold')
            
        plt.savefig(os.path.join(OUTPUT_DIR, "packet_stats.png"))
        plt.close()
        
        # 3. Simulated Compression Efficiency
        # Generate some dummy data for visualization
        data_types = ['Text (Logs)', 'JSON Data', 'Image (Raw)', 'Video (Stream)']
        original_sizes = [1024, 2048, 5120, 10240]
        compressed_sizes = [450, 600, 4800, 9500] # Simulated compression
        
        x = np.arange(len(data_types))
        width = 0.35
        
        plt.figure(figsize=(10, 6))
        fig, ax = plt.subplots()
        rects1 = ax.bar(x - width/2, original_sizes, width, label='Original Size', color='gray')
        rects2 = ax.bar(x + width/2, compressed_sizes, width, label='Compressed Size', color='teal')
        
        ax.set_ylabel('Size (Bytes)')
        ax.set_title('Data Compression Efficiency by Type')
        ax.set_xticks(x)
        ax.set_xticklabels(data_types)
        ax.legend()
        
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, "compression_stats.png"))
        plt.close()

    def print_stats(self):
        print("\n=== Simulation Summary ===")
        print(f"Total RTTs: {self.max_rtts}")
        print(f"Total Packets Sent: {self.packets_sent}")
        print(f"Loss Events: {self.packets_lost}")
        print(f"Final CWND: {self.cwnd}")
        print(f"Plots saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    sim = TCPRenoSimulator(ssthresh=32, max_rtts=50)
    sim.run()
