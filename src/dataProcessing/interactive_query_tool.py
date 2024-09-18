import json
import pandas as pd
import streamlit as st
from tabulate import tabulate
import plotly.express as px
import numpy as np

# ---------------------------
# Custom CSS to Adjust Table Spacing
# ---------------------------

def inject_css():
    st.markdown("""
    <style>
    /* Remove padding from table cells */
    table {
        border-collapse: collapse;
    }
    th, td {
        padding: 5px !important;
        text-align: left;
    }
    /* Optional: Adjust font size */
    table, th, td {
        font-size: 12px;
    }
    /* Optional: Remove margins */
    .css-1aumxhk {
        padding-top: 0rem;
        padding-bottom: 0rem;
    }
    </style>
    """, unsafe_allow_html=True)

# Call the inject_css function
inject_css()

# ---------------------------
# Data Loading and Preprocessing
# ---------------------------

@st.cache_data  # Updated cache decorator
def load_data(player_data_path, name_mappings_path, matches_path):
    # Load player data
    with open(player_data_path, 'r') as f:
        player_data = json.load(f)
    
    # Load name mappings
    with open(name_mappings_path, 'r') as f:
        name_mappings = json.load(f)
    
    # Normalize player names in player_data
    normalized_player_data = {}
    for original_name, stats in player_data.items():
        normalized_name = name_mappings.get(original_name, original_name)
        if normalized_name in normalized_player_data:
            # Optionally, merge stats if necessary
            # Example: Sum totalMatchesPlayed, totalWins, etc.
            normalized_player_data[normalized_name]['totalMatchesPlayed'] += stats.get('totalMatchesPlayed', 0)
            normalized_player_data[normalized_name]['totalWins'] += stats.get('totalWins', 0)
            normalized_player_data[normalized_name]['totalLosses'] += stats.get('totalLosses', 0)
            # Recalculate dependent stats if needed
            normalized_player_data[normalized_name]['overallWinRate'] = (normalized_player_data[normalized_name]['totalWins'] / normalized_player_data[normalized_name]['totalMatchesPlayed']) * 100 if normalized_player_data[normalized_name]['totalMatchesPlayed'] > 0 else 0
            # Repeat for other stats as necessary
            continue
        normalized_player_data[normalized_name] = stats
    
    # Convert to DataFrame
    player_df = pd.DataFrame.from_dict(normalized_player_data, orient='index')
    player_df.index.name = 'Player'
    
    # Handle data types and missing values
    for col in player_df.columns:
        # Skip columns that are dictionaries (like 'headToHeadRecords')
        if player_df[col].apply(lambda x: isinstance(x, dict)).any():
            continue
        player_df[col] = pd.to_numeric(player_df[col], errors='coerce')
    
    player_df = player_df.fillna(0)
    
    # Calculate clutch factor and straight vs normal win rate differences
    player_df['clutchFactor'] = (player_df['winRateDecidingGames'] - player_df['overallWinRate']) / player_df['overallWinRate'] * np.log(player_df['overallWinRate'] + 1)
    player_df['straightVsOverall'] = (player_df['winRateStraightMatches'] - player_df['overallWinRate']) / player_df['overallWinRate'] * np.log(player_df['overallWinRate'] + 1)
    
    # Load match data
    with open(matches_path, 'r') as f:
        matches = json.load(f)
    
    matches_df = pd.DataFrame(matches)
    
    # Normalize player names in matches
    matches_df['winnerName'] = matches_df['winnerName'].apply(lambda x: name_mappings.get(x, x))
    matches_df['loserName'] = matches_df['loserName'].apply(lambda x: name_mappings.get(x, x))
    
    return player_df, matches_df, name_mappings

# ---------------------------
# Define Functions for Queries
# ---------------------------

def sort_players_by_stat(player_df, stat_name, ascending=False, top_n=10):
    if stat_name not in player_df.columns:
        st.error(f"Statistic '{stat_name}' not found.")
        return
    sorted_df = player_df.sort_values(by=stat_name, ascending=ascending).head(top_n)
    
    # Reorder columns: move stat_name to the first column
    columns = [stat_name] + [col for col in sorted_df.columns if col != stat_name]
    sorted_df = sorted_df[columns]
    
    st.dataframe(sorted_df)
    
    # Add a bar chart
    fig = px.bar(sorted_df, x=sorted_df.index, y=stat_name, title=f"Top {top_n} Players by {stat_name}")
    st.plotly_chart(fig)

def get_most_played_matchups(matches_df, name_mappings, top_n=10):
    # Create a consistent representation for matchups
    matches_df['matchup'] = matches_df.apply(
        lambda row: tuple(sorted([row['winnerName'], row['loserName']])), axis=1
    )
    
    # Count matchups
    matchup_counts = matches_df['matchup'].value_counts().head(top_n)
    
    # Get win rates for each matchup
    matchup_stats = []
    for matchup, count in matchup_counts.items():
        p1, p2 = matchup
        total_matches = count
        p1_win_count = matches_df[
            (matches_df['winnerName'] == p1) & (matches_df['loserName'] == p2)
        ].shape[0]
        p2_win_count = matches_df[
            (matches_df['winnerName'] == p2) & (matches_df['loserName'] == p1)
        ].shape[0]
        
        win_rate_p1 = (p1_win_count / total_matches) * 100 if total_matches > 0 else 0
        win_rate_p2 = (p2_win_count / total_matches) * 100 if total_matches > 0 else 0
        
        matchup_stats.append({
            'Player 1': p1,
            'Player 2': p2,
            'Total Matches': total_matches,
            f'Win Rate {p1} (%)': f"{win_rate_p1:.2f}",
            f'Win Rate {p2} (%)': f"{win_rate_p2:.2f}"
        })
    
    matchup_df = pd.DataFrame(matchup_stats)
    st.dataframe(matchup_df)
    
    # Optional: Add a grouped bar chart for better visualization
    if not matchup_df.empty:
        # Prepare data for plotting
        plot_data = []
        for _, row in matchup_df.iterrows():
            plot_data.append({'Matchup': f"{row['Player 1']} vs {row['Player 2']}", 'Player': row['Player 1'], 'Win Rate (%)': float(row[f'Win Rate {row["Player 1"]} (%)'])})
            plot_data.append({'Matchup': f"{row['Player 1']} vs {row['Player 2']}", 'Player': row['Player 2'], 'Win Rate (%)': float(row[f'Win Rate {row["Player 2"]} (%)'])})
        
        plot_df = pd.DataFrame(plot_data)
        fig = px.bar(plot_df, x='Matchup', y='Win Rate (%)', color='Player', barmode='group',
                     title="Win Rates in Most Played Matchups")
        st.plotly_chart(fig)

def sort_players_by_clutch_factor(player_df, ascending=False, top_n=10):
    if 'clutchFactor' not in player_df.columns:
        st.error("Clutch factor not calculated.")
        return
    sorted_df = player_df.sort_values(by='clutchFactor', ascending=ascending).head(top_n)
    
    # Reorder columns: move 'clutchFactor' to the first column
    columns = ['clutchFactor'] + [col for col in sorted_df.columns if col != 'clutchFactor']
    sorted_df = sorted_df[columns]
    
    st.dataframe(sorted_df[['clutchFactor']])
    
    # Add a bar chart
    fig = px.bar(sorted_df, x=sorted_df.index, y='clutchFactor', title=f"Top {top_n} Players by Clutch Factor")
    st.plotly_chart(fig)

def compare_straight_vs_normal_win_rate(player_df, ascending=False, top_n=10):
    if 'straightVsOverall' not in player_df.columns:
        st.error("Straight vs overall win rate difference not calculated.")
        return
    sorted_df = player_df.sort_values(by='straightVsOverall', ascending=ascending).head(top_n)
    
    # Reorder columns: move 'straightVsOverall' to the first column
    columns = ['straightVsOverall'] + [col for col in sorted_df.columns if col != 'straightVsOverall']
    sorted_df = sorted_df[columns]
    
    st.dataframe(sorted_df[['straightVsOverall']])
    
    # Add a bar chart
    fig = px.bar(sorted_df, x=sorted_df.index, y='straightVsOverall', 
                 title=f"Top {top_n} Players by Straight vs Normal Win Rate Difference")
    st.plotly_chart(fig)

# ---------------------------
# Streamlit App Layout
# ---------------------------

def main():
    st.title("🏆 Player Stats Interactive Query Tool")
    st.markdown("""
    This tool allows you to explore and analyze player statistics, including sorting by various metrics, applying filters, analyzing matchups, and identifying clutch performers.
    """)
    
    # Load data
    player_data_path = '../data/playerDataPoints.json'
    name_mappings_path = 'nameMappings.json'
    matches_path = '../data/matches.json'
    
    player_df, matches_df, name_mappings = load_data(player_data_path, name_mappings_path, matches_path)
    
    # Sidebar
    st.sidebar.title("Menu")
    option = st.sidebar.selectbox(
        "Choose an action",
        ("Sort Players by Statistic", "Most Played Matchups", "Sort Players by Clutch Factor", "Compare Straight vs Normal Win Rate")
    )
    
    # Sidebar Filters
    st.sidebar.markdown("---")
    st.sidebar.header("🔧 Filters")
    
    # Identify numeric columns for filtering
    numeric_columns = player_df.select_dtypes(include=['number']).columns.tolist()
    # Remove index name if present
    if 'Player' in numeric_columns:
        numeric_columns.remove('Player')
    
    # Multiselect for selecting columns to filter
    selected_filters = st.sidebar.multiselect(
        "Select statistics to filter",
        options=numeric_columns
    )
    
    # Dictionary to hold filter criteria
    filter_criteria = {}
    
    # For each selected filter, get min and/or max values
    for stat in selected_filters:
        min_val = st.sidebar.number_input(f"Minimum {stat}", 
                                         value=float(player_df[stat].min()), 
                                         min_value=float(player_df[stat].min()), 
                                         max_value=float(player_df[stat].max()), 
                                         step=1.0,
                                         key=f"min_{stat}")
        max_val = st.sidebar.number_input(f"Maximum {stat}", 
                                         value=float(player_df[stat].max()), 
                                         min_value=float(player_df[stat].min()), 
                                         max_value=float(player_df[stat].max()), 
                                         step=1.0,
                                         key=f"max_{stat}")
        filter_criteria[stat] = (min_val, max_val)
    
    # Apply filters
    filtered_df = player_df.copy()
    for stat, (min_val, max_val) in filter_criteria.items():
        filtered_df = filtered_df[(filtered_df[stat] >= min_val) & (filtered_df[stat] <= max_val)]
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 📄 About")
    st.sidebar.markdown("""
    **Player Stats Interactive Query Tool** allows you to explore and analyze player statistics effortlessly. 
    - **Sort Players**: Organize players based on any statistic.
    - **Matchups**: Discover the most frequently played matchups and their respective win rates.
    - **Clutch Factor**: Identify players who perform better in deciding games compared to their overall performance.
    - **Win Rate Comparison**: Compare players' straight game win rates against their overall win rates.
    - **Filters**: Apply multiple filters to narrow down the player list based on specific criteria.
    """)
    
    # Main content based on selected option
    if option == "Sort Players by Statistic":
        st.header("🔍 Sort Players by Statistic")
        stat_options = player_df.columns.tolist()
        selected_stat = st.selectbox("Select Statistic", stat_options)
        sort_order = st.radio("Sort Order", ("Descending", "Ascending"))
        top_n = st.number_input("Number of Players to Display", min_value=1, max_value=len(filtered_df), value=10)
        ascending = True if sort_order == "Ascending" else False
        if st.button("Sort"):
            sort_players_by_stat(filtered_df, selected_stat, ascending, top_n)
    
    elif option == "Most Played Matchups":
        st.header("📊 Most Played Matchups and Win Rates")
        top_n = st.number_input("Number of Top Matchups to Display", min_value=1, max_value=100, value=10, key="matchups_top_n")
        if st.button("Show Matchups"):
            get_most_played_matchups(matches_df, name_mappings, top_n)
    
    elif option == "Sort Players by Clutch Factor":
        st.header("💪 Sort Players by Clutch Factor")
        sort_order = st.radio("Sort Order", ("Descending", "Ascending"), key="clutch_sort_order")
        top_n = st.number_input("Number of Players to Display", min_value=1, max_value=len(filtered_df), value=10, key="clutch_top_n")
        ascending = True if sort_order == "Ascending" else False
        if st.button("Sort by Clutch Factor"):
            sort_players_by_clutch_factor(filtered_df, ascending, top_n)
    
    elif option == "Compare Straight vs Normal Win Rate":
        st.header("📈 Compare Straight Game Win Rate to Normal Win Rate")
        sort_order = st.radio("Sort Order", ("Descending", "Ascending"), key="compare_sort_order")
        top_n = st.number_input("Number of Players to Display", min_value=1, max_value=len(filtered_df), value=10, key="compare_top_n")
        ascending = True if sort_order == "Ascending" else False
        if st.button("Compare Win Rates"):
            compare_straight_vs_normal_win_rate(filtered_df, ascending, top_n)

if __name__ == '__main__':
    main()
