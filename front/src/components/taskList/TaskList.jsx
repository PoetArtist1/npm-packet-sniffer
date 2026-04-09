import Task from './Task';
import axios from 'axios';

const TaskList = ({ data }) => {
  const { 
    url, // Usamos la URL que viene desde App.js
    todos, 
    setTodos, 
    setUpdatingTodos, 
    showDatePicker, 
    showTimePicker 
  } = data;

  const maxlength = 22;

  const removeTodo = (id) => {
    if (!url || !url.SERVER_BACK_URL) return;
    
    axios.delete(`${url.SERVER_BACK_URL}/todos/${id}`)
      .then(() => {
        setUpdatingTodos(true);
      })
      .catch(err => console.error("Error al eliminar tarea:", err));
  };

  const splitSentence = (sentence) => {
    return sentence
      .split(' ')
      .map((word, index) => {
        return splitWord(word, index);
      })
      .join(' ');
  };

  const splitWord = (word, index) => {
    let newWord = '';

    for (let i = 0; i < word.length; i++) {
      newWord += word[i];
      if (i % maxlength === 0 && i !== 0) {
        newWord += '- ';
      }
    }
    return newWord;
  };

  return (
    <div>
      {!showDatePicker && !showTimePicker && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100vw',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          {todos.map((todo, index) => (
            <Task
              key={todo._id || index}
              data={{
                url, // También pasamos la url a cada Task individual
                todo,
                setTodos,
                setUpdatingTodos,
                todos,
                index,
                removeTodo,
                splitSentence,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
