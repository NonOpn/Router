#!/bin/bash

mkdir -p build
rm -rf build/*

#cd to the app
cd app

#run typescript compiler
tsc

#back to main
cd ..

#copy back html files
mkdir -p build/server/html
cp -r app/server/html/* build/server/html/

#cp proper files into the dist folder
cp ./package.json ./build/
