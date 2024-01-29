const express = require("express");
const app = express();
var jwt = require("jsonwebtoken");
var cors = require("cors");
const Stripe = require("stripe");
const stripe = Stripe(
  "sk_test_51NF7jYKxDOAzYRyX4R1BdBr3DefXWLmgkPD8zFJTfHqbTBKzNYp2mBk9eKUDYE3kj0W1b22sjriYOJB1gQ6ZvzM7007G9KyJUS"
);
// const stripe = require("stripe");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware.........................
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zofgeos.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productsCollection = client.db("furniro").collection("products");
    const cartItemsCollection = client.db("furniro").collection("cartItems");
    const paymentCollection = client.db("furniro").collection("payment");
    const contactRequestCollection = client
      .db("furniro")
      .collection("contactRequest");

    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    app.post("/contact", async (req, res) => {
      const contact = req?.body;
      // console.log(contact);
      const result = await contactRequestCollection.insertOne(contact);
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const cartItem = req?.body;
      const result = await cartItemsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.get("/cart/:email", async (req, res) => {
      const query = req?.query?.email;
      const result = await cartItemsCollection.find(query).toArray();
      res.send(result);
    });

    //paymet ------------------
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      // console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent?.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;

      // Convert string IDs to ObjectId
      const objectIdArray = payment.id.map((id) => new ObjectId(id));

      const query = {
        _id: { $in: objectIdArray.map(String) }, // Convert ObjectId to string for comparison
      };

      console.log(query);

      try {
        // Use deleteMany with ObjectId
        const deleteResult = await cartItemsCollection.deleteMany(query);
        console.log(deleteResult);

        const insertResult = await paymentCollection.insertOne(payment);

        res.send({ insertResult, deleteResult });
      } catch (error) {
        console.error("Error deleting documents:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/payment/:email", async (req, res) => {
      const email = req.query.email;
      const result = await paymentCollection.find(email).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("furniro is running");
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
