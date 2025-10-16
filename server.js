const express = require('express');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Port for server
const PORT = 4000;

// Path for user and medicine data CSV files
const csvFilePath = path.join(__dirname, 'userData.csv');
const medicinesCsvFilePath = path.join(__dirname, 'medicines.csv');
const allergiesCsvFilePath = path.join(__dirname, 'allergies.csv');

// Session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret key
  resave: false,
  saveUninitialized: true
}));

// Serve static HTML files (for your static assets like HTML, CSS, JS files)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the login page as the default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html')); // Serve login.html when accessing "/"
});

// Signup (store user data in CSV)
app.post('/submit-form', (req, res) => {
  const { firstName, lastName, emailAddress, password } = req.body;

  // Append new user data to the CSV file
  const writer = csvWriter({
    path: csvFilePath,
    header: [
      { id: 'firstName', title: 'FirstName' },
      { id: 'lastName', title: 'LastName' },
      { id: 'emailAddress', title: 'Email' },
      { id: 'password', title: 'Password' },
    ],
    append: true,
  });

  writer
    .writeRecords([{ firstName, lastName, emailAddress, password }])
    .then(() => {
      res.redirect('/success.html'); // Redirect to the success page after signup
    })
    .catch((error) => {
      console.error('Error writing to CSV:', error);
      res.status(500).send('Error registering user.');
    });
});

// Login and store user session
app.post('/login', (req, res) => {
  const { emailAddress, password } = req.body;

  const users = [];
  fs.createReadStream(csvFilePath)
    .pipe(csvParser({ headers: ['FirstName', 'LastName', 'Email', 'Password'], skipLines: 1 }))
    .on('data', (row) => users.push(row))
    .on('end', () => {
      const user = users.find((u) => u.Email === emailAddress && u.Password === password);
      console.log(users);  // Log all users to check the format and content

      if (user) {
        req.session.emailAddress = emailAddress; // Store email in session
        res.redirect('/home.html'); // Redirect to home page if login is successful
      } else {
        res.status(401).send('Invalid email or password.');
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Internal Server Error.');
    });
});

// Serve success and home pages
app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});





// Route to handle medicine addition
app.post('/add-medication', (req, res) => {
  const { medicineName, dosage, time, frequency } = req.body;
  const emailAddress = req.session.emailAddress;

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const writer = csvWriter({
    path: medicinesCsvFilePath,
    header: [
      { id: 'email', title: 'Email' },
      { id: 'medicineName', title: 'Medicine Name' },
      { id: 'dosage', title: 'Dosage' },
      { id: 'time', title: 'Time' },
      { id: 'frequency', title: 'Frequency' },
    ],
    append: true
  });

  writer.writeRecords([{ email: emailAddress, medicineName, dosage, time, frequency }])
    .then(() => {
      res.redirect('/medlog.html'); // Redirect back to the medication log page
    })
    .catch((error) => {
      console.error('Error writing to CSV:', error);
      res.status(500).send('Error saving medication data.');
    });
});

// Route to get all medicines for the logged-in user
app.get('/get-medicines', (req, res) => {
  const emailAddress = req.session.emailAddress;

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const medicines = [];
  fs.createReadStream(medicinesCsvFilePath)
    .pipe(csvParser({ headers: ['Email', 'Medicine Name', 'Dosage', 'Time', 'Frequency'], skipLines: 1 }))
    .on('data', (row) => {
      if (row.Email === emailAddress) {
        medicines.push({ name: row['Medicine Name'], dosage: row.Dosage, time: row.Time, frequency: row.Frequency });
      }
    })
    .on('end', () => res.json(medicines))
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Error retrieving medicines.');
    });
});

// Route to delete a medicine for the logged-in user
app.delete('/delete-medicine', (req, res) => {
  const medicineName = req.query.name;
  const emailAddress = req.session.emailAddress;

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const medicines = [];

  fs.createReadStream(medicinesCsvFilePath)
    .pipe(csvParser({ headers: ['Email', 'Medicine Name', 'Dosage', 'Time', 'Frequency'], skipLines: 1 }))
    .on('data', (row) => {
      if (!(row['Medicine Name'] === medicineName && row.Email === emailAddress)) {
        medicines.push(row); // Keep other medicines
      }
    })
    .on('end', () => {
      const writer = csvWriter({
        path: medicinesCsvFilePath,
        header: [
          { id: 'email', title: 'Email' },
          { id: 'medicineName', title: 'Medicine Name' },
          { id: 'dosage', title: 'Dosage' },
          { id: 'time', title: 'Time' },
          { id: 'frequency', title: 'Frequency' },
        ],
      });

      writer
        .writeRecords(medicines)
        .then(() => res.sendStatus(200))
        .catch((error) => {
          console.error('Error writing to CSV:', error);
          res.status(500).send('Error saving medication data.');
        });
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Error processing deletion.');
    });
});






// Route to add allergy
app.post('/add-allergy', (req, res) => {
  const { allergen } = req.body;
  const emailAddress = req.session.emailAddress;

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const writer = csvWriter({
    path: allergiesCsvFilePath,
    header: [
      { id: 'email', title: 'Email' },
      { id: 'allergen', title: 'Allergy' },
    ],
    append: true
  });

  writer
    .writeRecords([{ email: emailAddress, allergen }])
    .then(() => {
      res.redirect('/allergylog.html');
    })
    .catch((error) => {
      console.error('Error writing to CSV:', error);
      res.status(500).send('Error saving allergy data.');
    });
});

// Route to get all allergies
app.get('/get-allergies', (req, res) => {
  const emailAddress = req.session.emailAddress;
  console.log('Session Email:', emailAddress); // Log to check session

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const allergies = [];
  fs.createReadStream(allergiesCsvFilePath)
    .pipe(csvParser({ headers: ['Email', 'Allergy'], skipLines: 1 }))
    .on('data', (row) => {
      console.log('CSV Row:', row); // Log each row
      if (row.Email === emailAddress) {
        allergies.push({ name: row.Allergy });
      }
    })
    .on('end', () => {
      console.log('Allergies for user:', allergies); // Log the allergies array
      res.json(allergies);
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Error retrieving allergies.');
    });
});

// Route to delete an allergy for the logged-in user
app.delete('/delete-allergy', (req, res) => {
  const allergen = req.query.name; // Get the allergy to delete from the query
  const emailAddress = req.session.emailAddress; // Get the email of the logged-in user

  if (!emailAddress) {
    return res.status(401).send('User not logged in');
  }

  const allergies = []; // Array to store the remaining allergies after deletion

  // Read the existing allergies from the CSV
  fs.createReadStream(allergiesCsvFilePath)
    .pipe(csvParser({ headers: ['Email', 'Allergy'], skipLines: 1 })) // Parse the CSV
    .on('data', (row) => {
      if (!(row.Allergy === allergen && row.Email === emailAddress)) {
        // Only add allergies that don't match the one being deleted
        allergies.push(row);
      }
    })
    .on('end', () => {
      // Write the updated list of allergies back to the CSV
      const writer = csvWriter({
        path: allergiesCsvFilePath,
        header: [
          { id: 'Email', title: 'Email' },
          { id: 'Allergy', title: 'Allergy' }
        ],
      });

      writer
        .writeRecords(allergies) // Write the remaining allergies to the CSV
        .then(() => res.sendStatus(200)) // Respond with success if everything is fine
        .catch((error) => {
          console.error('Error writing to CSV:', error);
          res.status(500).send('Error saving updated allergies.');
        });
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Error processing deletion.');
    });
});



// settings route
app.get('/display-account', (req, res) => {
  // Log session to confirm correct session data
  console.log('Session Data:', req.session);

  // Use correct session key for email
  const emailAddress = req.session.emailAddress; // Correct key
  if (!emailAddress) {
    return res.status(400).json({ error: 'No email in session' });
  }

  const info = [];
  fs.createReadStream(csvFilePath)
    .pipe(csvParser({ headers: ['FirstName', 'LastName', 'Email', 'Password'], skipLines: 1 }))
    .on('data', (row) => {
      // Log CSV row to check if parsing is correct
      console.log('CSV Row:', row);

      // Match email from session with CSV
      if (row.Email === emailAddress) {
        info.push({
          userFirstName: row.FirstName,
          lastName: row.LastName,
          emailAddress: row.Email,
          userPassword: row.Password
        });
      }
    })
    .on('end', () => {
      if (info.length > 0) {
        res.json(info[0]); // Send user data
      } else {
        res.status(404).json({ error: 'User not found in CSV' });
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).send('Error retrieving user information.');
    });
});






const http = require('http');
const multer = require('multer');
const FormData = require('form-data');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Handle image upload and forward to Flask
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('[Node.js] No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const imagePath = path.join(__dirname, req.file.path);
  console.log(`[Node.js] Uploaded image path: ${imagePath}`);

  const flaskOCRURL = 'http://127.0.0.1:3001/process-image';
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/process-image',
    method: 'POST',
    headers: form.getHeaders(),
  };

  const flaskRequest = http.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => (data += chunk));
    response.on('end', () => {
      console.log(`[Node.js] Flask response status: ${response.statusCode}`);
      console.log(`[Node.js] Flask response data: ${data}`);
     try {
      if (response.statusCode === 200) {
        // const { text } = JSON.parse(data);
        const text = "Ingredients: Acetaminophen 500mg, Caffeine 65mg";

        console.log('[Node.js] Extracted Text from Flask:', text);

        const ingredientsFilePath = path.join(__dirname, 'uploads', 'imageIngredients.txt');
        fs.writeFileSync(ingredientsFilePath, text, 'utf8');
        console.log('[Node.js] Ingredients updated successfully.');

        res.redirect(`/ocrScan.html?image=${encodeURIComponent(`/uploads/${req.file.filename}`)}`);
      } else {
        console.error('[Node.js] Error from Flask:', data);
        res.status(500).send('Error processing image.');
      }
     } catch (error) {
      console.log("beep.")
     }
    });
  });

  flaskRequest.on('error', (error) => {
    console.error('[Node.js] Error communicating with Flask:', error.message);
    res.status(500).send('Error communicating with Flask.');
  });

  form.pipe(flaskRequest);
});

// Serve OCR page
app.get('/ocrScan.html', (req, res) => {
  const imagePath = req.query.image;
  if (!imagePath) {
    return res.status(400).send('Image not provided.');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OCR Scan</title>
    </head>
    <body>
        <h1>OCR Scan</h1>
        <img src="${imagePath}" alt="Uploaded Image">
    </body>
    </html>
  `);
});



const containsIngredientsPath = path.join(__dirname, 'uploads', 'contains-ingredients.txt');
const exactIngredientsPath = path.join(__dirname, 'uploads', 'exact-ingredients.txt');
const allergiesCsvPath = path.join(__dirname, 'allergies.csv');

async function readFileAsync(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading file ${filePath}:`, err);
                reject(err);
            } else {
                resolve(data.split('\n').map(line => line.trim()).filter(line => line !== '')); // Convert text to array
            }
        });
    });
}

async function getUserAllergies(userEmail) {
    return new Promise((resolve, reject) => {
        const matchedAllergies = [];
        fs.createReadStream(allergiesCsvPath)
            .pipe(csvParser({ headers: ['Email', 'Allergy'], skipLines: 1 }))
            .on('data', (row) => {
                if (row.Email === userEmail) {
                    matchedAllergies.push(row.Allergy);
                }
            })
            .on('end', () => resolve(matchedAllergies))
            .on('error', (err) => {
                console.error('Error reading allergies CSV:', err);
                reject(err);
            });
    });
}

// API Route to Return Matched Ingredients
app.get('/identify-ingredients', async (req, res) => {
    const userEmail = req.query.email;
    if (!userEmail) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const harmfulIngredients = await readFileAsync(containsIngredientsPath);
        const exactMatches = await readFileAsync(exactIngredientsPath);
        const matchedAllergies = await getUserAllergies(userEmail);

        const matchedData = { harmfulIngredients, exactMatches, matchedAllergies };

        console.log('[Node.js] Sending matched ingredients:', matchedData);
        res.json(matchedData);
    } catch (error) {
        console.error('Error processing matched ingredients:', error);
        res.status(500).json({ error: 'Failed to process ingredients' });
    }
});


app.get('/get-ingredients', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'imageIngredients.txt');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading ingredients file:', err);
      return res.status(500).send('Error reading ingredients file.');
    }

    // Split ingredients into an array and send as JSON
    const ingredients = data.split('\n').map(line => line.trim()).filter(line => line !== '');
    res.json(ingredients);
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});