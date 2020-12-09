#!/bin/bash
# Basic while loop
counter=1
while [ $counter -lt 10 ]
do
    sudo mysql -u root -proot db_sbo < troubleshoot.sql
    ((counter++))
done
echo "all done"