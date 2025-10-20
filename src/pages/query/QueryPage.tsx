import styled from "@emotion/styled";

export default function Home() {
  const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    text-align: center;
    `
  const Title = styled.h1`
    color: blue;
    `
  const Memo = styled.h3`
    color: green;
    `


  return (
    <Wrapper>
      <Title>Query 페이지입니다 🏠</Title>
      <Memo>데장장이들 열심히 해보아요</Memo>
    
    </Wrapper>
  );
}
