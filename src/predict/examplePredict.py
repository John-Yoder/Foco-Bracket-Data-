# Import necessary functions and libraries from predictor.py
from predictor import predict_match_outcome
import joblib

# Load the trained model
model_filename = 'trained_logistic_regression_model.pkl'
model = joblib.load(model_filename)

# Example usage of predict_match_outcome function in examplePredict.py
if __name__ == '__main__':
    # Call the prediction function, passing the trained model as an argument
    probability = predict_match_outcome('Owl', 'DayNeptune930', 'Best of 3', model)
    print(f"Predicted probability: {probability:.2f}")
