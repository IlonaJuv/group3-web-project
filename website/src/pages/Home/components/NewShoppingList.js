import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { createShoppingList } from '../../../reducers/shoppingListReducer'
import './NewShoppingList.css'
import Home from '../Home'

const NewShoppingList = ({ setWantsToCreate }) => {
  const [list, setList] = useState({ title: '', comment: '' })
  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(createShoppingList(list))
    setWantsToCreate(false)
  }

  const handleTitleChange = (e) => {
    setList({ ...list, title: e.target.value })
  }

  const handleCommentChange = (e) => {
    setList({ ...list, comment: e.target.value })
  }

  const handleCancel = () => {  
    return <Home />
  }

  return (
    <div className="formLayout">
      <form>
        <h3>Make a New List</h3>
        <div className="insideForm">
          <label>Title:</label>
          <input type="text" onChange={handleTitleChange} value={list.title} />
          <label>Comment:</label>
          <input
            type="text"
            onChange={handleCommentChange}
            value={list.comment}
          />
          <button disabled={list.title === ''} type="submit" onClick={handleSubmit}>
            Save List
          </button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default NewShoppingList
