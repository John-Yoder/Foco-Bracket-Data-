import json
import pandas as pd
from tabulate import tabulate

# Load player data
with open('../data/playerDataPoints.json', 'r') as f:
    player_data = json.load(f)

# Load name mappings
with open('nameMappings.json', 'r') as f:
    name_mappings = json.load(f)

# Normalize player names in player_data
normalized_player_data = {}
for original_name, stats in player_data.items():
    normalized_name = name_mappings.get(original_name, original_name)
    if normalized_name in normalized_player_data:
        # Handle merging stats if necessary
        # For simplicity, we'll skip duplicates; alternatively, you could aggregate stats
        continue
    normalized_player_data[normalized_name] = stats

# Convert to DataFrame
player_df = pd.DataFrame.from_dict(normalized_player_data, orient='index')

# Handle data types and missing values
for col in player_df.columns:
    # Skip columns that are dictionaries (like 'headToHeadRecords')
    if player_df[col].apply(lambda x: isinstance(x, dict)).any():
        continue
    player_df[col] = pd.to_numeric(player_df[col], errors='coerce')

player_df = player_df.fillna(0)

# Calculate clutch factor and straight vs normal win rate differences
player_df['clutchFactor'] = player_df['winRateDecidingGames'] - player_df['overallWinRate']
player_df['straightVsOverall'] = player_df['winRateStraightMatches'] - player_df['overallWinRate']

# Define functions

def sort_players_by_stat(stat_name, ascending=False, top_n=10):
    if stat_name not in player_df.columns:
        print(f"Statistic '{stat_name}' not found.")
        return
    sorted_df = player_df.sort_values(by=stat_name, ascending=ascending)
    print(tabulate(sorted_df.head(top_n), headers='keys', tablefmt='psql'))

def get_most_played_matchups(top_n=10):
    # Load match data
    try:
        with open('../data/matches.json', 'r') as f:
            matches = json.load(f)
    except FileNotFoundError:
        print("Error: 'matches.json' file not found.")
        return
    except json.JSONDecodeError:
        print("Error: 'matches.json' contains invalid JSON.")
        return

    matches_df = pd.DataFrame(matches)
    
    # Check if necessary columns exist
    required_columns = {'player1', 'player2', 'winner'}
    if not required_columns.issubset(matches_df.columns):
        print(f"Error: 'matches.json' must contain columns: {required_columns}")
        return
    
    # Normalize player names in matches
    matches_df['player1'] = matches_df['player1'].apply(lambda x: name_mappings.get(x, x))
    matches_df['player2'] = matches_df['player2'].apply(lambda x: name_mappings.get(x, x))
    matches_df['winner'] = matches_df['winner'].apply(lambda x: name_mappings.get(x, x))
    
    # Create a consistent representation for matchups
    matches_df['matchup'] = matches_df.apply(
        lambda row: tuple(sorted([row['player1'], row['player2']])), axis=1
    )
    
    # Count matchups
    matchup_counts = matches_df['matchup'].value_counts().head(top_n)
    
    # Get win rates for each matchup
    matchup_stats = []
    for matchup, count in matchup_counts.items():
        p1, p2 = matchup
        total_matches = count
        p1_wins = matches_df[
            ((matches_df['player1'] == p1) & (matches_df['player2'] == p2) & (matches_df['winner'] == p1)) |
            ((matches_df['player1'] == p2) & (matches_df['player2'] == p1) & (matches_df['winner'] == p1))
        ].shape[0]
        p2_wins = total_matches - p1_wins
        win_rate_p1 = p1_wins / total_matches if total_matches > 0 else 0
        win_rate_p2 = p2_wins / total_matches if total_matches > 0 else 0
        matchup_stats.append({
            'Player 1': p1,
            'Player 2': p2,
            'Total Matches': total_matches,
            f'Win Rate {p1}': f"{win_rate_p1:.2%}",
            f'Win Rate {p2}': f"{win_rate_p2:.2%}"
        })
    matchup_df = pd.DataFrame(matchup_stats)
    print(tabulate(matchup_df, headers='keys', tablefmt='psql'))

def sort_players_by_clutch_factor(ascending=False, top_n=10):
    if 'clutchFactor' not in player_df.columns:
        print("Clutch factor not calculated.")
        return
    sorted_df = player_df.sort_values(by='clutchFactor', ascending=ascending)
    print(tabulate(sorted_df.head(top_n), headers='keys', tablefmt='psql'))

def compare_straight_vs_normal_win_rate(ascending=False, top_n=10):
    if 'straightVsOverall' not in player_df.columns:
        print("Straight vs overall win rate difference not calculated.")
        return
    sorted_df = player_df.sort_values(by='straightVsOverall', ascending=ascending)
    print(tabulate(sorted_df.head(top_n), headers='keys', tablefmt='psql'))

# Interactive menu
def main():
    while True:
        print("\n--- Player Stats Query Tool ---")
        print("1. Sort players by a statistic")
        print("2. Show most played matchups and win rates")
        print("3. Sort players by clutch factor")
        print("4. Compare straight game win rate to normal win rate")
        print("5. Exit")
        choice = input("Enter your choice: ").strip()
        
        if choice == '1':
            stat = input("Enter the statistic name to sort by: ").strip()
            ascending_input = input("Sort ascending? (yes/no): ").strip().lower()
            ascending = True if ascending_input == 'yes' else False
            try:
                top_n = int(input("Enter the number of players to display (default 10): ").strip() or 10)
            except ValueError:
                top_n = 10
            sort_players_by_stat(stat, ascending=ascending, top_n=top_n)
        elif choice == '2':
            try:
                top_n = int(input("Enter the number of top matchups to display (default 10): ").strip() or 10)
            except ValueError:
                top_n = 10
            get_most_played_matchups(top_n=top_n)
        elif choice == '3':
            ascending_input = input("Sort ascending? (yes/no): ").strip().lower()
            ascending = True if ascending_input == 'yes' else False
            try:
                top_n = int(input("Enter the number of players to display (default 10): ").strip() or 10)
            except ValueError:
                top_n = 10
            sort_players_by_clutch_factor(ascending=ascending, top_n=top_n)
        elif choice == '4':
            ascending_input = input("Sort ascending? (yes/no): ").strip().lower()
            ascending = True if ascending_input == 'yes' else False
            try:
                top_n = int(input("Enter the number of players to display (default 10): ").strip() or 10)
            except ValueError:
                top_n = 10
            compare_straight_vs_normal_win_rate(ascending=ascending, top_n=top_n)
        elif choice == '5':
            print("Exiting the query tool.")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == '__main__':
    main()
