import { useState } from 'react';
import CalendarIcon from './CalendarIcon';
import PlusIcon from './PlusIcon';
import TimeIcon from './TimeIcon';
import dayjs from 'dayjs';
import axios from 'axios';

const TaskAdder = ({ data }) => {
  const {
    url, // Usamos la URL que viene desde el componente App padre
    setUpdatingTodos,
    input,
    setInput,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
  } = data;

  const [limitDate, setLimitDate] = useState({});
  const [limitTime, setLimitTime] = useState({});

  const addTodo = () => {
    if (!url || !url.SERVER_BACK_URL) {
      console.error("La URL del servidor no está disponible aún.");
      return;
    }

    const date = dayjs();

    const thisLimitDate =
      Object.keys(limitDate).length > 0
        ? limitDate
        : {
            day: date.$D,
            month: date.$M + 1,
            year: date.$y,
          };

    const thisLimitTime =
      Object.keys(limitTime).length > 0
        ? {
            ...limitTime,
          }
        : {
            hour: 23,
            minute: 59,
          };

    const fullDate = {
      ...thisLimitDate,
      ...thisLimitTime,
    };

    const newTodo = {
      description: input,
      limitDate: {
        ...fullDate,
      },
      completed: false,
      delayed: false,
    };

    // Realizamos el POST a la URL correcta
    axios.post(`${url.SERVER_BACK_URL}/todos`, newTodo)
      .then(() => {
        if (input.trim()) {
          setUpdatingTodos(true);
          setInput('');
        }
        setLimitDate({});
        setLimitTime({});
      })
      .catch(error => {
        console.error("Error al añadir tarea:", error);
        alert("Error al conectar con el servidor. Verifica que el backend esté corriendo.");
      });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: '20px',
      }}
    >
      <CalendarIcon
        data={{
          showDatePicker,
          setShowDatePicker,
          setShowTimePicker,
          setLimitDate,
        }}
      />
      <TimeIcon
        data={{
          showTimePicker,
          setShowTimePicker,
          setShowDatePicker,
          setLimitTime,
        }}
      />

      <input
        style={{
          padding: '10px',
          paddingLeft: '85px',
          fontSize: '16px',
          width: '300px',
          marginRight: '10px',
          borderRadius: '15px',
          fontFamily: 'monospace',
        }}
        type='text'
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Add a new task'
        autoFocus
        onKeyUp={(e) => {
          if (e.key === 'Enter') {
            addTodo();
          }
        }}
      />
      <PlusIcon data={{ addTodo }} />
    </div>
  );
};

export default TaskAdder;
