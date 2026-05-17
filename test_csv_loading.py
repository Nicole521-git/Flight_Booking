import csv
import os
from typing import List, Dict

# 定义数据列的映射，提高代码可读性
COL_ID = 0
COL_TITLE = 1
COL_FNAME = 2
COL_LNAME = 3
COL_GENDER = 4
COL_EMAIL = 5

def test_load_passengers():
    file_path = r'e:\massey_class\159352-Advanced Web Development\A2\flight-booking_1\randomnames.csv'
    if not os.path.exists(file_path):
        print("Error: CSV file not found.")
        return

    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        passengers = list(reader)
        print(f"Successfully loaded {len(passengers)} passenger records.")
        
        if passengers:
            sample = passengers[0]
            # 使用命名变量而非魔法数字索引
            print(f"Sample - Name: {sample[COL_TITLE]} {sample[COL_FNAME]} {sample[COL_LNAME]}")
            print(f"Sample - Email: {sample[COL_EMAIL]}")

if __name__ == "__main__":
    test_load_passengers()