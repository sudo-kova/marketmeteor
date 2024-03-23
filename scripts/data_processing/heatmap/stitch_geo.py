import pandas as pd
from geopy.geocoders import Nominatim
import time

columns = ['Ticker', 'Address', 'City', 'State', 'Country', 'Website', 'Sector', 'Industry', 'Description']
locations_df = pd.read_csv('../../../data/sectors/locations.csv', names=columns)

# locations_df = locations_df.head(20)


geolocator = Nominatim(user_agent="your_app_name")

def get_coordinates(city, state):
    try:
        location = geolocator.geocode(f"{city}, {state}")
        if location:
            return location.latitude, location.longitude
        return None, None
    except:
        return None, None

# Process each row and print the status
for index, row in locations_df.iterrows():
    lat, lon = get_coordinates(row['City'], row['State'])
    locations_df.at[index, 'Latitude'] = lat
    locations_df.at[index, 'Longitude'] = lon
    print(f"Processed {index + 1}/{len(locations_df)}: {lon}, {lat}")

    # Sleep to respect rate limits
    time.sleep(1)

# Save to new CSV file
locations_df.to_csv('../../../data/sectors/locations_geo.csv', index=False)
