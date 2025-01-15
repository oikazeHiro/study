## liquibase

#### 引入

gradle

```groovy
implementation 'org.liquibase:liquibase-core:4.30.0'
```



maven

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
    <version>4.30.0</version>
</dependency>
```

#### 编写配置文件

```yaml
# 在配置文件中中配置Liquibase
spring:
  liquibase:
    change-log: classpath:liquibase/changelog/changelog-master.yaml

# 在resources 下创建文件夹 liquibase/changelog/changes
# 在liquibase/changelog下创建 changelog-master.yaml
# 在liquibase/changelog/changes下创建 001-initial-schema.yaml
# changelog-master.yaml:

databaseChangeLog:
  - include:
      file: classpath:liquibase/changelog/changes/001-initial-schema.yaml

# 001-initial-schema.yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: oik
      changes:
        - createTable:
            tableName: test_liquibase
            columns:
              - column:
                  name: id
                  type: int
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: username
                  type: varchar(255)
                  constraints:
                  nullable: false


```



启动项目

![截图1](.\assets\屏幕截图%202025-01-15%20153521.png)



![截图2](.\assets\屏幕截图%202025-01-15%20153607.png)

生成数据库





#### Liquibase databaseChangeLog 所有属性解析

Liquibase 的 databaseChangeLog 是一个 YAML 或 XML 文件，用于定义数据库模式变更。以下是 databaseChangeLog 中所有可能的属性及其解释：

- databaseChangeLog
  这是根元素，包含所有的变更集（changeSet）。
- changeSet
  每个 changeSet 定义了一组要应用到数据库的更改。它有以下属性：
  id (必填)：唯一标识符，确保每个变更集在整个项目中是唯一的。
  author (必填)：变更集的作者。
  context (可选)：指定在哪些上下文中应用此变更集。可以是逗号分隔的字符串。
  labels (可选)：为变更集添加标签，便于过滤和管理。
  dbms (可选)：指定适用的数据库类型，如 MySQL、PostgreSQL 等。
  runAlways (可选)：如果设置为 true，每次运行时都会执行该变更集，默认为 false。
  runOnChange (可选)：如果设置为 true，当文件内容发生变化时会重新执行，默认为 false。
  failOnError (可选)：如果设置为 false，即使发生错误也不会中断整个变更日志的执行，默认为 true。
  validCheckSum (可选)：指定校验和，用于验证变更集是否已正确应用。
  rollback (可选)：定义回滚操作，以便在需要时撤销变更集。
- changes
  每个 changeSet 包含一个或多个 changes，每个 change 定义具体的数据库操作。常见的 change 类型包括：
  addColumn：向表中添加新列。
  dropColumn：从表中删除列。
  addPrimaryKey：为表添加主键。
  dropPrimaryKey：删除表的主键。
  createTable：创建新表。
  dropTable：删除表。
  insert：插入数据。
  update：更新数据。
  delete：删除数据。
  renameColumn：重命名列。
  renameTable：重命名表。
  modifyDataType：修改列的数据类型。
  addForeignKeyConstraint：添加外键约束。
  dropForeignKeyConstraint：删除外键约束。
  
  createIndex 添加索引
  sql：执行自定义 SQL 语句。
- columns
  对于某些 change 类型（如 addColumn），可以定义 columns 来描述列的详细信息：
  name (必填)：列名。
  type (必填)：列的数据类型，如 varchar(255)、int 等。
  value (可选)：默认值。
  constraints (可选)：定义列的约束条件，如 primaryKey、nullable 等。





#### 测试

配置添加字段：

![jt3](./assets/屏幕截图%202025-01-15%20154502.png)

测试结果：

![jt4](./assets/屏幕截图%202025-01-15%20154544.png)

测试添加索引：

```yaml
databaseChangeLog:
  - changeSet:
      id: 2025-01-15-002-initial-schema
      author: oik
      changes:
        - createIndex:
            tableName: test_liquibase
            indexName: idx_test_liquibase_username
            columns:
              name: username
```

结果：

![jt5](./assets/屏幕截图%202025-01-15%20155954.png)



### 补充和示例

### 常见的 `changes` 操作类型及其属性

#### 1. **createTable**

- 用于创建表。

- **属性**：
  
  - `tableName`：表名（必需）。
  - `schemaName`：模式名称（可选）。
  - `catalogName`：目录名称（可选）。
  - `tablespace`：表空间（可选）。
  - `columns`：定义列的列表（必需）。

- **列的属性**：
  
  - `name`：列名（必需）。
  - `type`：数据类型（必需）。
  - `autoIncrement`：是否自增（可选，布尔值）。
  - `constraints`：列约束（可选）。
    - `primaryKey`：是否为主键。
    - `nullable`：是否允许为空。
    - `unique`：是否唯一。
    - `foreignKeyName`：外键名称。
    - `referencedTableName`：引用的表名。
    - `referencedColumnNames`：引用的列名。

- **示例**：
  
  ```yaml
  changes:
    - createTable:
        tableName: example
        columns:
          - column:
              name: id
              type: int
              autoIncrement: true
              constraints:
                primaryKey: true
          - column:
              name: name
              type: varchar(255)
  
  ```

---

#### 2. **addColumn**

- 用于向表中添加列。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `schemaName`：模式名称（可选）。
  - `columns`：定义新列的列表（必需）。

- **列的属性**与 `createTable` 类似。

- **示例**：
  
  ```yaml
  changes:
    - addColumn:
        tableName: example
        columns:
          - column:
              name: age
              type: int
              constraints:
                nullable: false
  
  ```

---

#### 3. **dropColumn**

- 用于删除列。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `columnName`：要删除的列名（必需）。
  - `schemaName`：模式名称（可选）。

- **示例**：
  
  ```yaml
  changes:
    - dropColumn:
        tableName: example
        columnName: age
  ```

---

#### 4. **renameColumn**

- 用于重命名列。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `oldColumnName`：旧列名（必需）。
  - `newColumnName`：新列名（必需）。
  - `columnDataType`：数据类型（可选）。
  - `schemaName`：模式名称（可选）。

- **示例**：
  
  ```yaml
  changes:
    - renameColumn:
        tableName: example
        oldColumnName: name
        newColumnName: full_name
  
  ```

---

#### 5. **insert**

- 用于向表中插入数据。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `schemaName`：模式名称（可选）。
  - `columns`：包含列名和值的列表（必需）。
    - 每个列定义为 `name` 和 `value`。

- **示例**：
  
  ```yaml
  changes:
    - insert:
        tableName: example
        columns:
          - column:
              name: id
              value: 1
          - column:
              name: name
              value: 'Sample Data'
  
  ```

---

#### 6. **update**

- 用于更新表中的数据。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `schemaName`：模式名称（可选）。
  - `where`：条件语句，用于指定要更新的行（必需）。
  - `columns`：包含列名和值的列表（必需）。

- **示例**：
  
  ```yaml
  changes:
    - update:
        tableName: example
        where: id=1
        columns:
          - column:
              name: name
              value: 'Updated Data'
  
  ```

---

#### 7. **delete**

- 用于从表中删除数据。

- **属性**：
  
  - `tableName`：目标表名（必需）。
  - `schemaName`：模式名称（可选）。
  - `where`：条件语句，用于指定要删除的行（可选）。

- **示例**：
  
  ```yaml
  changes:
    - delete:
        tableName: example
        where: id=1
  
  ```

---

#### 8. **createIndex**

- 用于创建索引。

- **属性**：
  
  - `indexName`：索引名称（必需）。
  - `tableName`：目标表名（必需）。
  - `columns`：定义索引列的列表（必需）。
  - `unique`：是否为唯一索引（可选）。

- **示例**：
  
  ```yaml
  changes:
    - createIndex:
        indexName: idx_name
        tableName: example
        unique: true
        columns:
          - column:
              name: name
  
  ```

---

#### 9. **dropIndex**

- 用于删除索引。

- **属性**：
  
  - `indexName`：索引名称（必需）。
  - `tableName`：目标表名（必需）。

- **示例**：
  
  ```yaml
  changes:
    - dropIndex:
        indexName: idx_name
        tableName: example
  
  ```

---

#### 10. **customChange**

- 用于定义自定义的数据库变更。

- **属性**：
  
  - `class`：自定义类的完全限定名称（必需）。
  - `parameters`：传递给自定义类的参数（可选）。

- **示例**：
  
  ```yaml
  changes:
    - customChange:
        class: com.example.CustomTask
        parameters:
          param1: value1
  
  ```

---

### 其他常见操作

- **renameTable**：重命名表。
- **dropTable**：删除表。
- **addForeignKeyConstraint**：添加外键约束。
- **dropForeignKeyConstraint**：删除外键约束。
- **addUniqueConstraint**：添加唯一约束。
- **dropUniqueConstraint**：删除唯一约束。
- **addPrimaryKey**：添加主键。
- **dropPrimaryKey**：删除主键。
