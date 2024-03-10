import pandas as pd
import hashlib
import random

# Define the path to the log file
log_file_path = '/var/log/apache2/access.log'

# Define a function to parse each line of the log file
def parse_log_line(line):
    parts = line.split()
    username = ip_to_username(parts[0])
    return {
        'Anonymous Name': username,
        'Timestamp': ' '.join(parts[3:5]).strip('[]'),
        'Request': ' '.join(parts[5:8]).strip('""'),
        'StatusCode': parts[8],
        'Size': parts[9],
    }

# Function to convert IP address to a creative username
def ip_to_username(ip):
    hash_object = hashlib.sha256(ip.encode())
    hash_digest = hash_object.hexdigest()
    random.seed(hash_digest)

    adjectives = [
        "Mighty", "Ancient", "Noble", "Fierce", "Majestic",
        "Sly", "Cunning", "Brave", "Wise", "Swift",
        "Gentle", "Bold", "Daring", "Energetic", "Loyal",
        "Curious", "Playful", "Witty", "Joyful", "Serene"
    ]

    dinosaurs = [
        "Tyrannosaurus", "Velociraptor", "Triceratops", "Stegosaurus", "Brachiosaurus",
        "Allosaurus", "Spinosaurus", "Diplodocus", "Ankylosaurus", "Pterodactyl",
        "Gallimimus", "Parasaurolophus", "Iguanodon", "Carnotaurus", "Therizinosaurus",
        "Oviraptor", "Compsognathus", "Pachycephalosaurus", "Deinonychus", "Giganotosaurus"
    ]

    # Generate a unique username combining an adjective and a dinosaur name
    return random.choice(adjectives) + "-" + random.choice(dinosaurs) + "-" + hash_digest[:6]


# Read the log file and parse each line
with open(log_file_path, 'r') as file:
    lines = file.readlines()

parsed_lines = [parse_log_line(line) for line in lines]

# Convert the parsed data to a DataFrame
df = pd.DataFrame(parsed_lines)

# Reverse the DataFrame order to make the most recent entries on top
df = df.iloc[::-1]

# Separate the DataFrame into two based on the condition
df_api = df[df['Request'].str.contains('/api/')]
df_non_api = df[~df['Request'].str.contains('/api/')]

# Save the DataFrames as separate CSV files
csv_file_path_api = '/incoming/marketmeteor-data/parsed_access_log_api.csv'
csv_file_path_non_api = '/incoming/marketmeteor-data/parsed_access_log_non_api.csv'

df_api.to_csv(csv_file_path_api, index=False)
df_non_api.to_csv(csv_file_path_non_api, index=False)
