import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import os
from pathlib import Path
import moment

# Function to normalize player names
def normalize_player_name(name):
    separator = '| '
    index = name.find(separator)
    if index != -1:
        return name[index + len(separator):].strip()
    return name.strip()

# Load player data
player_data_path = 'src/data/playerDataPoints.json'  # Use forward slashes
if not os.path.exists(player_data_path):
    print(f"Error: {player_data_path} does not exist.")
    exit(1)

with open(player_data_path, 'r') as f:
    player_data = json.load(f)

# Convert to DataFrame
player_df = pd.DataFrame.from_dict(player_data, orient='index')

# Check for missing values
print("Missing values per column:")
print(player_df.isnull().sum())

# For simplicity, fill missing numerical values with the median
numerical_cols = player_df.select_dtypes(include=['float64', 'int64']).columns
player_df[numerical_cols] = player_df[numerical_cols].fillna(player_df[numerical_cols].median())

# Initialize the scaler
scaler = StandardScaler()

# Fit and transform the numerical features
player_df[numerical_cols] = scaler.fit_transform(player_df[numerical_cols])

# Load matches data
matches_data_path = 'data/matches.json'  # Ensure this path is correct
if not os.path.exists(matches_data_path):
    print(f"Error: {matches_data_path} does not exist.")
    exit(1)

matches_df = pd.read_json(matches_data_path)

# Normalize player names in matches_df
matches_df['winnerName'] = matches_df['winnerName'].apply(normalize_player_name)
matches_df['loserName'] = matches_df['loserName'].apply(normalize_player_name)

# Function to create match features
def create_match_features(row):
    try:
        winner_stats = player_df.loc[row['winnerName']]
        loser_stats = player_df.loc[row['loserName']]
    except KeyError as e:
        print(f"KeyError: {e} - Ensure both players are in playerDataPoints.json")
        return None

    # Difference in stats
    stats_diff = winner_stats - loser_stats

    # Add match format
    best_of = 3 if row['bestOf'] == 'Best of 3' else 5

    # Prepare feature vector
    features = stats_diff.to_dict()
    features['bestOf'] = best_of

    # Label (1 for winner, 0 for loser)
    label = 1

    return pd.Series({**features, 'label': label})

# Function to create reverse match features
def create_reverse_match_features(row):
    try:
        winner_stats = player_df.loc[row['winnerName']]
        loser_stats = player_df.loc[row['loserName']]
    except KeyError as e:
        print(f"KeyError: {e} - Ensure both players are in playerDataPoints.json")
        return None

    # Difference in stats (loser - winner)
    stats_diff = loser_stats - winner_stats

    # Add match format
    best_of = 3 if row['bestOf'] == 'Best of 3' else 5

    # Prepare feature vector
    features = stats_diff.to_dict()
    features['bestOf'] = best_of

    # Label (0 for loser)
    label = 0

    return pd.Series({**features, 'label': label})

# Create training data
features_list = []

for idx, row in matches_df.iterrows():
    try:
        # Check if both players are in player_df
        if row['winnerName'] in player_df.index and row['loserName'] in player_df.index:
            # Winner vs Loser
            winner_features = create_match_features(row)
            if winner_features is not None:
                features_list.append(winner_features)

            # Loser vs Winner (to balance the dataset)
            loser_features = create_reverse_match_features(row)
            if loser_features is not None:
                features_list.append(loser_features)
    except Exception as e:
        print(f"Error processing match {idx}: {e}")

# Remove None entries if any
features_list = [f for f in features_list if f is not None]

# Check if training data is not empty
if not features_list:
    print("No valid training data found. Please check your data files.")
    exit(1)

training_df = pd.DataFrame(features_list)

# Fill missing values in training data
training_df = training_df.fillna(0)

# Separate features and labels
X = training_df.drop('label', axis=1)
y = training_df['label']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Initialize the Logistic Regression model with L2 regularization
model = LogisticRegression(penalty='l2', solver='lbfgs', max_iter=1000)

# Fit the model
model.fit(X_train, y_train)

# Predict on test set
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

# Evaluate accuracy
accuracy = accuracy_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_prob)

print(f"Accuracy: {accuracy:.2f}")
print(f"ROC AUC Score: {roc_auc:.2f}")

# Classification report
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Function to predict match outcome
def predict_match_outcome(player1_name, player2_name, best_of_format):
    # Normalize player names
    player1_name = normalize_player_name(player1_name)
    player2_name = normalize_player_name(player2_name)

    if player1_name not in player_df.index or player2_name not in player_df.index:
        print("One or both players not found in player data.")
        return None

    # Get player stats
    player1_stats = player_df.loc[player1_name]
    player2_stats = player_df.loc[player2_name]

    # Difference in stats
    stats_diff = player1_stats - player2_stats

    # Add match format
    best_of = 3 if best_of_format == 'Best of 3' else 5
    stats_diff['bestOf'] = best_of

    # Reshape for prediction
    feature_vector = stats_diff.values.reshape(1, -1)

    # Predict probability
    prob = model.predict_proba(feature_vector)[0][1]

    print(f"Probability that {player1_name} will win: {prob:.2f}")
    return prob

# Example usage:
# Replace 'PlayerA' and 'PlayerB' with actual player names from your data
# predict_match_outcome('PlayerA', 'PlayerB', 'Best of 5')
