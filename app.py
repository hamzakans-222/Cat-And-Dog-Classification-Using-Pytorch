from flask import Flask, request, jsonify, send_file
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import io
import os

app = Flask(__name__, static_folder='.', static_url_path='')

class CNN(nn.Module):
    def __init__(self):
        super(CNN, self).__init__()
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.fc_layers = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 16 * 16, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 2)
        )
    def forward(self, x):
        x = self.conv_layers(x)
        x = self.fc_layers(x)
        return x

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CNN().to(device)

# Load checkpoint
checkpoint_path = "cat_dog_checkpoint (1).pth"
if os.path.exists(checkpoint_path):
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    print("Modèle chargé avec succès !")
else:
    print(f"Erreur: Le fichier {checkpoint_path} est introuvable.")

transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

classes = ['Cat', 'Dog']

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'Aucune image envoyée'})
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'})

    try:
        image = Image.open(io.BytesIO(file.read())).convert('RGB')
        image = transform(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            outputs = model(image)
            probabilities = torch.softmax(outputs, dim=1)[0]
            _, predicted = torch.max(outputs, 1)
            result = classes[predicted.item()]
            confidence_cat = probabilities[0].item()
            confidence_dog = probabilities[1].item()
            confidence = max(confidence_cat, confidence_dog)
            
        return jsonify({
            'class': result,
            'confidence': confidence,
            'confidence_cat': confidence_cat,
            'confidence_dog': confidence_dog
        })
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    print("Démarrage du serveur... Allez sur http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
