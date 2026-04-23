import matplotlib.pyplot as plt
import os
from datetime import datetime
import json

def plot_tcp_stats(stats_data, output_dir_base=None, session_id=None):
    """
    Generates TCP analysis plots:
    1. CWND & SSTHRESH vs Time with events (TRIPLE_DUP_ACK, TIMEOUT)
    2. Packet reliability bar chart
    3. Throughput display
    4. CWND vs ACK index (new graph)
    Also saves raw stats to JSON.
    """
    # --- Setup output directory ---
    if output_dir_base is None:
        output_dir_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generated_plots')

    if not session_id:
        session_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    
    output_dir = os.path.join(output_dir_base, session_id)
    os.makedirs(output_dir, exist_ok=True)

    # --- Save raw stats ---
    try:
        stats_file = os.path.join(output_dir, f"tcp_stats_{session_id}.json")
        with open(stats_file, "w") as f:
            json.dump(stats_data, f, indent=4)
        print(f"[Plotter] Stats saved to {stats_file}")
    except Exception as e:
        print(f"[Plotter] Failed to save stats file: {e}")

    # --- 1. CWND vs Time plot ---
    cwnd_log = stats_data.get("cwnd_log", [])
    if cwnd_log:
        timestamps = [entry.get("timestamp", 0) for entry in cwnd_log]
        cwnds = [entry["cwnd"] for entry in cwnd_log]
        ssthreshes = [entry["ssthresh"] for entry in cwnd_log]

        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, cwnds, label='CWND', color='blue', linewidth=2)
        plt.plot(timestamps, ssthreshes, label='SSTHRESH', color='red', linestyle='--', linewidth=2)

        # Mark TRIPLE_DUP_ACK and TIMEOUT events
        for entry in cwnd_log:
            if entry["event"] == "TRIPLE_DUP_ACK":
                plt.scatter(entry["timestamp"], entry["cwnd"], color='orange', marker='x', s=100,
                            label='Fast Retransmit (3x Dup ACK)' if 'Fast Retransmit' not in plt.gca().get_legend_handles_labels()[1] else "")
            elif entry["event"] == "TIMEOUT":
                plt.scatter(entry["timestamp"], entry["cwnd"], color='black', marker='o', s=100,
                            label='Timeout & Retransmit' if 'Timeout' not in plt.gca().get_legend_handles_labels()[1] else "")

        # Annotate phases
        textstr = '\n'.join((
            r'$\bf{TCP\ Reno\ Phases:}$',
            r'- SLOW_START: Exponential CWND growth',
            r'- CONGESTION_AVOIDANCE: Linear growth',
            r'- Markers: Loss & Retransmit'
        ))
        props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
        plt.gca().text(0.02, 0.95, textstr, transform=plt.gca().transAxes, fontsize=10, verticalalignment='top', bbox=props)

        plt.title(f"TCP Reno Analysis: CWND vs Time (Session: {session_id})")
        plt.xlabel("Time (seconds)")
        plt.ylabel("Window Size (packets)")
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.legend(loc='lower right')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, "tcp_cwnd_vs_time.png"))
        plt.close()
        
     # Exponential growth simulation for illustration
        doubling_cwnd = []
        doubling_time = []
        cwnd_val = 1
        for t in timestamps:
            doubling_cwnd.append(cwnd_val)
            doubling_time.append(t)
            if cwnd_val*2 <= max(cwnds):
                cwnd_val *= 2
            else:
                cwnd_val = max(cwnds)

        plt.figure(figsize=(12, 6))
        plt.plot(doubling_time, doubling_cwnd, label='CWND Doubling (SLOW_START)', color='green', linewidth=2, marker='o')
        plt.title(f"TCP CWND Doubling Illustration (Session: {session_id})")
        plt.xlabel("Time (seconds)")
        plt.ylabel("CWND (packets)")
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, "tcp_cwnd_doubling.png"))
        plt.close()

    # --- 2. Packet reliability ---
    plt.figure(figsize=(8, 6))
    labels = ['Sent', 'Lost/Retransmitted']
    values = [stats_data.get("packets_sent", 0), stats_data.get("packets_lost", 0)]
    colors = ['green', 'red']
    plt.bar(labels, values, color=colors)
    plt.title(f"Session Reliability (Duration: {stats_data.get('duration', 0):.2f}s)")
    plt.ylabel("Packet Count")
    for i, v in enumerate(values):
        plt.text(i, v, str(v), ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "tcp_reliability_stats.png"))
    plt.close()

    # --- 3. Throughput ---
    throughput_kbps = stats_data.get("throughput_bps", 0) / 1024
    plt.figure(figsize=(6, 4))
    plt.text(0.5, 0.5, f"{throughput_kbps:.2f} Kbps", ha='center', va='center', fontsize=24, fontweight='bold', color='teal')
    plt.title("Average Throughput")
    plt.axis('off')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "tcp_throughput.png"))
    plt.close()

    # --- 4. NEW: CWND vs ACK index ---
    if cwnd_log:
        ack_index = list(range(1, len(cwnd_log)+1))  # 1, 2, 3, ...
        plt.figure(figsize=(12, 6))
        plt.plot(ack_index, cwnds, label='CWND', color='blue', linewidth=2)
        plt.plot(ack_index, ssthreshes, label='SSTHRESH', color='red', linestyle='--', linewidth=2)
        plt.title(f"TCP Reno Analysis: CWND vs ACK Index (Session: {session_id})")
        plt.xlabel("ACK Number (Index)")
        plt.ylabel("Window Size (packets)")
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.legend(loc='lower right')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, "tcp_cwnd_vs_ack_index.png"))
        plt.close()

    # --- 5. RTT & RTO Analysis ---
    if cwnd_log:
        rtt_vals = [entry.get("rtt", 0) * 1000 for entry in cwnd_log] # Convert to ms
        rto_vals = [entry.get("rto", 0) * 1000 for entry in cwnd_log] # Convert to ms
        timestamps = [entry.get("timestamp", 0) for entry in cwnd_log]
        
        # Filter out 0 values (from init) for better plotting
        plot_data = [(t, rtt, rto) for t, rtt, rto in zip(timestamps, rtt_vals, rto_vals) if rto > 0]
        if plot_data:
            ts, rtts, rtos = zip(*plot_data)
            
            plt.figure(figsize=(12, 6))
            plt.plot(ts, rtts, label='Estimated RTT (Jagged)', color='green', linewidth=1, marker='.', markersize=4)
            plt.plot(ts, rtos, label='RTO (Timeout Interval)', color='red', linewidth=2, linestyle='-')
            
            plt.fill_between(ts, rtts, rtos, color='yellow', alpha=0.1, label='Safety Margin (4*DevRTT)')
            
            plt.title(f"Jacobson's Algorithm: RTT Estimation & RTO Calculation (Session: {session_id})")
            plt.xlabel("Time (seconds)")
            plt.ylabel("Time (milliseconds)")
            plt.grid(True, linestyle='--', alpha=0.6)
            plt.legend()
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, "tcp_rtt_rto_analysis.png"))
            plt.close()

    print(f"[Plotter] Graphs saved to {output_dir}")
