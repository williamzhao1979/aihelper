'use client';

import { useState } from "react";

const searchPH = "Test Search...";

const aryNum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const aryStr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const alphabet = "abcdefghijklmnopqrstuvwxyz";

const myTuple = [1, "a", true];
const myTuple2 = [2, "b", false];

const myStr = `
Hello World

This is a multi-line
string in JavaScript.
`;

type myType = {
  name: string;
  age: number;
  isStudent: boolean;
}

const myObj: myType = {
  name: "John",
  age: 20,
  isStudent: true,
}

type myGenericType<T> = {
  value: T;
  valueAry: T[];
}

const myGenericObj: myGenericType<string> = {
  value: "Hello",
  valueAry: ["Hello", "World"],
}


// function handleSearch() {
//   console.log("Search");
//   alert("Search");
// }

function handleSearch2(keyword?: string) {
  console.log("Search", keyword);
  alert("Search " + keyword);
}

const myFunc = (a: number, b: number) => {
  return a + b;
}


export default function PracticetsxPage() {
  const [searchText, setSearchText] = useState("");


  function onChangeSearch(e: React.ChangeEvent<HTMLInputElement>) {
    console.log("Search Text", e.target.value);
    setSearchText(e.target.value);
  }

  function handleSearch(searchText: string) {
    console.log("Search", searchText);
    // alert("Search " + searchText);
    alert(myFunc(1, 2));
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <input
        type="text"
        placeholder={searchPH}
        value={searchText}
        onChange={(e) => onChangeSearch(e)}
        className="mb-6 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
      />
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={() => handleSearch(searchText)}>
        Search
      </button>
      <h1 className="text-2xl font-bold mb-4">Practicetsx Page</h1>
      <p className="text-lg">This is a placeholder for the Practicetsx page.</p>
      <p>{myTuple[0]}</p>
      <p>{myTuple[1]}</p>
      <p>{myTuple[2]}</p>
      <p>{myStr}</p>  
      <p>{myObj.name}</p>
      <p>{myObj.age}</p>
      <p>{myObj.isStudent}</p>
      <p>{myGenericObj.value}</p>
      <p>{myGenericObj.valueAry[0]}</p>
      <p>{myGenericObj.valueAry[1]}</p>
      <p>{myFunc(1, 2)}</p>
      <p style={{ color: "red", fontSize: "20px", prop1: "test"  }}>This is a red text</p>
    </div>  
  );
}