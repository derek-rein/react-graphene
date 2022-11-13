// import {addMinutes} from 'date-fns'

export const lineData: LineData[] = [
    {time: 20, value: 20}, 
    {time: 30, value: 50},
    {time: 50, value: 10},
    {time: 80, value: 60},
    {time: 90, value: 1},
    {time: 100, value: 20},
    {time: 100, value: 90},
    {time: 110, value: 110},
]


// export const data: LineData[] = []

// let start = new Date(0)

// Array(1000).fill('').map((z, i) => {
//   let zz = addMinutes(start, Math.random() * 10000) as any
//   const new_row: LineData = {time: zz/1000 as number, value: Math.random() * 100}
//   data.push(new_row)
//   start = zz
// })

// Array(1000).fill('').map((z, i) => {data.push(
//   {
//   time: addMinutes(start, Math.random() * 1000).getTime(),
//   value: Math.random() * 100
//   }
// )

// })
