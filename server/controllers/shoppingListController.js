const mongoose = require('mongoose')
const ShoppingItem = require('../models/ShoppingItem')
const ShoppingList = require('../models/ShoppingList')

/**
 * checks if user id matches shoppinglist owner
 * @param {*} ownerId shoppinglist owner field
 * @param {*} userId user id
 * @returns true if id matches, otherwise false
 */
const verifyOwnership = (ownerId, userId) => {
  return ownerId.toString() === userId.toString()
}

/**
 * gets list of objects and makes an array that contains product schema items
 * @param {*} list list of product objects
 * @returns list of broduct schema elements, if provided list is empty or null returns an empty list
 */
function makeProducts(list) {
  if (!list || list === []) {
    return []
  }
  const schemaList = []
  list.forEach((element) => {
    schemaList.push(
      new ShoppingItem({
        name: element.name || 'no name',
        amount: element.amount || null,
        unit: element.unit || null,
        comment: element.comment || null,
        checked: element.checked || false,
      }),
    )
  })
  return schemaList
}

/**
 * used to get shoppinglists linked to the user
 * @route GET api/shoppinglists
 * @param {*} req request
 * @param {*} res response
 * @returns shoppinglists that match users id
 */

const getUserLists = async (req, res) => {
  try {
    const uLists = await ShoppingList.find({ owner: req.id }).sort({
      createdAt: -1,
    })
    if (uLists.length === 0) {
      return res.status(400).send({ error: 'no lists found for you' })
    }
    res.status(200).send(uLists)
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
}

/**
 * returns specific shoppinglist
 * @route GET api/shoppingLists/{listId}
 * @param {*} req request
 * @param {*} res response
 * @returns one list matching the id given in the route
 */
const getListbyId = async (req, res) => {
  const { shListId: id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'not a valid id' })
  }
  const list = await ShoppingList.findById(id)
  if (!verifyOwnership(list.owner, req.id)) {
    return res.status(400).send({ error: "you can't access this list" })
  }

  if (!list) {
    return res.status(404).json({ error: 'No list found with this id' })
  }
  res.status(200).send(list)
}

/**
 * add shoppinglist to database
 * @route POST api/shoppinglists
 * @Body json object containing title, itemList(array of item objects), comment
 * only title is mandatory
 * example:
 * {
    "title": "mylist",
    "itemList": [
        {
            "name": "saippua",
            "amount": 2,
            "comment": "punasta"
        }
    ],
    "comment": null
  }
 * @param {*} req request
 * @param {*} res response
 */
const addShoppingLists = async (req, res) => {
  const { title, comment = '', itemList } = req.body // body = title, comment(optional), list of item objects
  const products = makeProducts(itemList)
  try {
    const shoppingList = await ShoppingList.create({
      title,
      products,
      comment,
      owner: req.id,
    })
    res.status(200).send(shoppingList)
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
}

/**
 * delete existing shoppinglist
 * @route DELETE api/{shoppinglistId}
 * @param {*} req request
 * @param {*} res body
 * @returns shoppinglist that was deleted
 */
const deleteShoppingList = async (req, res) => {
  const { shListId: id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ error: "id didn't match" })
  }
  const list = await ShoppingList.findById(id)

  if (!verifyOwnership(list.owner, req.id)) {
    return res.status(400).send({ error: "you can't delete this list" })
  }

  if (!list) {
    return res.status(404).json({ error: 'No list found' })
  }
  await list.remove()
  res.status(200).send(list)
}

/**
 * update existing shoppinglist
 * @route PATCH api/shoppingLists/{shoppinglistId}
 * @body json object containing fields that you want to change and their new values
 * any fields can be left out
 * fields are:
 * title, itemList(array of item objects), comment
 * !if you want to only edit one item in itemlist use edititemfromlist or deleteitemfromlist instead
 * !array can be empty array so if you don't wat to delete all items from itemlist leave itemlist
 * field out of the request body
 * example:
 * {
    "title": "mylist",
    "itemList": [
        {
            "name": "saippua",
            "amount": 2,
            "comment": "punasta"
        }
    ],
    "comment": null
  }
 * @param {*} req request
 * @param {*} res response
 * @returns updated shoppinglist
 */
const updateShoppingList = async (req, res) => {
  const { shListId: id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'No list for this id found' })
  }
  const { title = null, comment = '', products: itemList } = req.body
  let products = null
  if (itemList) {
    products = makeProducts(itemList)
  }
  try {
    const shoppingList = await ShoppingList.findById(id)
    if (!shoppingList) {
      return res.status(400).send({ error: 'no find list' })
    }
    if (!verifyOwnership(shoppingList.owner, req.id)) {
      return res.status(400).send({ error: "You can't modify this list" })
    }
    await ShoppingList.findByIdAndUpdate(shoppingList._id, {
      title: title || shoppingList.title,
      products,
      comment,
    })
    const updated = await ShoppingList.findById(shoppingList._id)
    res.status(200).send(updated)
  } catch (error) {
    console.error(error)
    res.status(400).send({ error: error.message })
  }
}

/**
 * delete one item from shoppinglist
 * @route DELETE api/shoppingLists/{shoppinglistId}/item/{itemId}
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deleteItemFromList = async (req, res) => {
  const { shListId: id, id: productId } = req.params // list id (path)

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'list id is not valid' })
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send({ error: 'product id is not valid' })
  }

  const list = await ShoppingList.findById(id)

  if (!verifyOwnership(list.owner, req.id)) {
    return res.status(400).send({ error: "You can't modify this list" })
  }

  if (!list) {
    return res.status(404).json({ error: 'No list found' })
  }

  const editedList = list.products.filter((p) => p.id !== productId)

  const updated = await ShoppingList.findByIdAndUpdate(
    list._id,
    { title: list.title, products: editedList, comment: list.comment },
    { new: true },
  )
  res.status(200).send(updated)
}

/**
 * edit one item from shoppinglist
 * @route PATCH api/shoppingLists/{shoppinglistId}/item/{itemId}
 * @body fields of the product that you want to modify
 * fields can include name, amount, unit, comment
 * !leave the fields out of the body that you don't want to modify
 * example:
  {
    "name": "ffff",
    "amount": "x määrä",
    "unit": "kuppia",
    "comment": "kommentti"
  }
 * @param {*} req
 * @param {*} res
 * @returns updated shoppinglist
 */
const editItemFromList = async (req, res) => {
  const { shListId: id, id: productId } = req.params // list id (path)
  const {
    name = null,
    amount = null,
    unit = null,
    comment = null,
    checked = null,
  } = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'list id is not valid' })
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send({ error: 'product id is not valid' })
  }

  const list = await ShoppingList.findById(id)

  if (!verifyOwnership(list.owner, req.id)) {
    return res.status(400).send({ error: "You can't modify this list" })
  }

  if (!list) {
    return res.status(404).json({ error: 'No list found' })
  }

  const product = list.products.find((p) => p.id === productId)
  const newProduct = new ShoppingItem({
    name: name || product.name,
    amount: amount || product.amount,
    unit: unit || product.unit,
    comment: comment || product.comment,
    checked,
    _id: product.id,
  })

  const newList = list.products.map((item) => {
    if (item.id === productId) {
      return newProduct
    }
    return item
  })
  const updated = await ShoppingList.findByIdAndUpdate(
    list._id,
    { products: newList },
    { new: true },
  )
  res.status(200).send(updated)
}

/**
 * gets all the lists from database for dev use only
 * @route GET api/shoppingLists/all
 * @param {*} req
 * @param {*} res
 * @returns all shoppinglists from database
 */
const getAll = async (req, res) => {
  try {
    const uLists = await ShoppingList.find({})
    if (uLists.length === 0) {
      return res.status(400).send({ error: 'no lists found for you' })
    }
    res.status(200).json(uLists)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

/**
 * adds x amount of items to the specified list
 * @route PATCH /:shListId/item/
 * @body one item as json object or an json object containing "itemlist" list of objects
 * example1:
 * {
            "name": "saippua",
            "amount": 2,
            "unit": "dl",
            "comment": "punasta"
    }

 * example2:
{
  "itemList": [
        {
            "name": "saippua",
            "amount": 2,
            "comment": "punasta"
        },
        {
            "name": "saippua",
            "amount": 2,
            "comment": "punasta"
        }
    ]
  }

 * @param {*} req
 * @param {*} res
 * @returns
 */

const addItemsToList = async (req, res) => {
  const { shListId: id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'No list for this id found' })
  }
  const { itemList } = req.body

  let products = null
  if (itemList) {
    products = makeProducts(itemList)
  }

  if (!products) {
    const { name, amount, unit, comment, checked } = req.body
    products = [
      {
        name,
        amount,
        unit,
        comment,
        checked,
      },
    ]
    products = makeProducts(products)
  }

  try {
    const shoppingList = await ShoppingList.findById(id)
    if (!shoppingList) {
      return res.status(400).send({ error: 'no find list' })
    }
    if (!verifyOwnership(shoppingList.owner, req.id)) {
      return res.status(400).send({ error: "You can't modify this list" })
    }
    const updated = await ShoppingList.findByIdAndUpdate(
      shoppingList._id,
      {
        products: [...products, ...shoppingList.products],
      },
      { new: true },
    )
    res.status(200).send(updated)
  } catch (error) {
    console.error(error)
    res.status(400).send({ error: error.message })
  }
}

// clears all data from database
// route DELETE api/shoppingLists/reset
const formatDb = async (req, res) => {
  await ShoppingList.deleteMany({})
  await ShoppingItem.deleteMany({})
  res.status(204).end()
}

module.exports = {
  getUserLists,
  addShoppingLists,
  deleteShoppingList,
  getListbyId,
  updateShoppingList,
  getAll,
  formatDb,
  deleteItemFromList,
  editItemFromList,
  addItemsToList,
}
