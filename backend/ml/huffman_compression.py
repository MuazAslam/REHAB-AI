import heapq
from collections import defaultdict, Counter
import json

class HuffmanNode:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq

class HuffmanCoder:
    def __init__(self):
        self.heap = []
        self.codes = {}
        self.reverse_mapping = {}

    def make_frequency_dict(self, data):
        """
        Calculate frequency of each symbol in data.
        Data is expected to be a list of quantized values (integers).
        """
        return Counter(data)

    def make_heap(self, frequency):
        """Create a min-heap efficiently."""
        for key in frequency:
            node = HuffmanNode(key, frequency[key])
            heapq.heappush(self.heap, node)

    def merge_nodes(self):
        """Build the Huffman Tree by merging lowest freq nodes."""
        while len(self.heap) > 1:
            node1 = heapq.heappop(self.heap)
            node2 = heapq.heappop(self.heap)

            merged = HuffmanNode(None, node1.freq + node2.freq)
            merged.left = node1
            merged.right = node2

            heapq.heappush(self.heap, merged)

    def make_codes_helper(self, root, current_code):
        if root == None:
            return

        if root.char is not None:
            self.codes[root.char] = current_code
            self.reverse_mapping[current_code] = root.char
            return

        self.make_codes_helper(root.left, current_code + "0")
        self.make_codes_helper(root.right, current_code + "1")

    def make_codes(self):
        """Traverse the tree to generate binary codes."""
        if not self.heap:
            return
        
        root = heapq.heappop(self.heap)
        self.make_codes_helper(root, "")
        
        # Restore heap/root for visualization or debug if needed
        # (For now we just consume it, assumes one-time build per batch)

    def build_tree_from_data(self, data):
        """One-shot method to build codes from a data sample."""
        frequency = self.make_frequency_dict(data)
        self.make_heap(frequency)
        self.merge_nodes()
        self.make_codes()
        return self.codes

    def encode(self, data):
        """
        Encode a list of values into a unified bitstring.
        Returns: (encoded_text, codes_dict)
        """
        encoded_text = ""
        for element in data:
            if element in self.codes:
                encoded_text += self.codes[element]
            else:
                # Fallback for unseen values? 
                # Ideally, we build the tree on the SAME data we encode for optimal storage
                pass
        return encoded_text

    @staticmethod
    def compress_angles(angles_list):
        """
        Helper to Quantize -> Compress a list of float angles.
        Returns: 
         - compressed_string (str of 0s and 1s)
         - code_map (dict to decode)
        """
        # 1. Quantize (Round to nearest integer to reduce unique symbols)
        quantized = [int(round(a)) for a in angles_list]
        
        # 2. Build Huffman Tree for this specific frame/batch
        coder = HuffmanCoder()
        coder.build_tree_from_data(quantized)
        
        # 3. Encode
        encoded_bits = coder.encode(quantized)
        return encoded_bits, coder.codes

    def decode(self, encoded_text):
        """
        Decode a bitstring back to the original list of values using the reverse mapping.
        """
        decoded_values = []
        current_code = ""
        for bit in encoded_text:
            current_code += bit
            if current_code in self.reverse_mapping:
                decoded_values.append(self.reverse_mapping[current_code])
                current_code = ""
        return decoded_values

